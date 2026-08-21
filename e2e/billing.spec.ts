import { createHmac } from "node:crypto";
import { test, expect } from "@playwright/test";
import { planIdForCheckout, verifyRazorpayWebhookSignature } from "../lib/billing/razorpay";
import { normalizeSubscriptionTier, PRICING } from "../lib/constants";
import { connectedAccountLimit, dailyLimitsForTier } from "../lib/entitlements";

/**
 * The subscription lifecycle, as far as it can be tested without charging money.
 *
 * There was no billing coverage at all before this file, which is a strange gap
 * for the one part of the product that moves money. What is pinned here is
 * everything up to the Razorpay API call and everything after the webhook lands:
 * which plan id a checkout resolves to, whether a webhook signature is accepted,
 * what a Razorpay status becomes locally, and what a tier is then allowed to do.
 *
 * What is deliberately not here is a live checkout. Creating a real subscription
 * needs live keys and a card, and a test that "passes" by talking to a payment
 * provider from CI is worse than an honest boundary — `pnpm billing:plans`
 * covers the account-side configuration instead.
 *
 * These run in the signed-out project because they need neither a browser
 * session nor a database.
 */

/** Restored after each test: several cases below deliberately unset plan ids. */
const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test.describe("checkout plan resolution", () => {
  test("resolves the monthly and annual plan of each paid tier", () => {
    for (const plan of PRICING) {
      process.env[plan.planEnv] = `plan_${plan.tier}_monthly`;
      process.env[plan.annualPlanEnv] = `plan_${plan.tier}_annual`;

      expect(planIdForCheckout({ tier: plan.tier, billingCycle: "monthly", currency: "USD" })).toBe(
        `plan_${plan.tier}_monthly`
      );
      expect(planIdForCheckout({ tier: plan.tier, billingCycle: "annual", currency: "USD" })).toBe(
        `plan_${plan.tier}_annual`
      );
    }
  });

  test("never falls back to another tier's plan id", () => {
    // The regression this exists for: the retired fallback mapped Agency onto
    // RAZORPAY_PLAN_PRO_MONTHLY_USD, so a deployment with Pro configured and
    // Agency not would have charged an Agency subscriber $39 instead of $79
    // and told nobody. Missing configuration must fail instead.
    process.env.RAZORPAY_PLAN_PRO_MONTHLY_USD = "plan_pro_monthly";
    delete process.env.RAZORPAY_PLAN_AGENCY_MONTHLY_USD;

    expect(() => planIdForCheckout({ tier: "agency", billingCycle: "monthly", currency: "USD" })).toThrow(
      /RAZORPAY_PLAN_AGENCY_MONTHLY_USD/
    );
  });

  test("names the missing variable so a failed checkout is diagnosable", () => {
    delete process.env.RAZORPAY_PLAN_STARTER_ANNUAL_USD;
    expect(() => planIdForCheckout({ tier: "starter", billingCycle: "annual", currency: "USD" })).toThrow(
      /Missing required environment variable: RAZORPAY_PLAN_STARTER_ANNUAL_USD/
    );
  });

  test("refuses to start a checkout for the free tier", () => {
    expect(() => planIdForCheckout({ tier: "free", billingCycle: "monthly", currency: "USD" })).toThrow(
      /paid tier/i
    );
  });

  test("every paid tier names a distinct plan variable", () => {
    // Two tiers sharing a variable is the same overcharge in a different shape,
    // and it is invisible until someone subscribes.
    const names = PRICING.flatMap((plan) => [plan.planEnv, plan.annualPlanEnv]);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(6);
  });
});

test.describe("webhook signature", () => {
  const secret = "test_webhook_secret";
  const body = JSON.stringify({ event: "subscription.activated" });

  test.beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  });

  test("accepts a signature over the exact bytes", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(body, signature)).toBe(true);
  });

  test("rejects a body that changed after signing", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(`${body} `, signature)).toBe(false);
  });

  test("rejects a signature from a different secret", () => {
    const signature = createHmac("sha256", "someone_elses_secret").update(body).digest("hex");
    expect(verifyRazorpayWebhookSignature(body, signature)).toBe(false);
  });

  test("rejects a missing or short signature rather than throwing", () => {
    // timingSafeEqual throws on a length mismatch, so the length check in front
    // of it is load-bearing: without it a one-character signature would 500 the
    // route instead of being refused.
    expect(verifyRazorpayWebhookSignature(body, null)).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, "abc")).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, "")).toBe(false);
  });
});

test.describe("webhook endpoint", () => {
  test("never accepts an unsigned webhook", async ({ request }) => {
    // The contract, stated the way the dispatch test states its own: whatever
    // else happens, an unsigned request must not be treated as a real one.
    const response = await request.post("/api/webhooks/razorpay", {
      data: { event: "subscription.activated", payload: {} },
    });
    expect(response.status()).not.toBe(200);
    expect([401, 400, 500]).toContain(response.status());
  });
});

test.describe("tier resolution", () => {
  test("maps the retired ladder onto the nearest current seat", () => {
    // Rows sold under the old names must keep resolving. Nobody is silently
    // upgraded: scale, the old top tier, lands on pro rather than agency.
    expect(normalizeSubscriptionTier("essentials")).toBe("starter");
    expect(normalizeSubscriptionTier("growth")).toBe("pro");
    expect(normalizeSubscriptionTier("scale")).toBe("pro");
  });

  test("treats anything unrecognised as free", () => {
    // A cancelled subscription, a typo, or a null column must not hand out a
    // paid seat.
    expect(normalizeSubscriptionTier(null)).toBe("free");
    expect(normalizeSubscriptionTier(undefined)).toBe("free");
    expect(normalizeSubscriptionTier("enterprise")).toBe("free");
    expect(normalizeSubscriptionTier(42)).toBe("free");
  });

  test("passes the current tiers through unchanged", () => {
    for (const tier of ["free", "starter", "pro", "agency"] as const) {
      expect(normalizeSubscriptionTier(tier)).toBe(tier);
    }
  });
});

test.describe("what a tier buys", () => {
  test("daily caps and account limits rise with the ladder", () => {
    // The pricing page is generated from the same constants, so this is what
    // stops a plan edit from quietly shipping a cheaper plan with more quota.
    const free = dailyLimitsForTier("free");
    const starter = dailyLimitsForTier("starter");
    const pro = dailyLimitsForTier("pro");
    const agency = dailyLimitsForTier("agency");

    expect(free.posts).toBeLessThan(starter.posts);
    expect(starter.posts).toBeLessThan(pro.posts);
    expect(pro.posts).toBeLessThan(agency.posts);

    expect(starter.comments).toBeLessThan(pro.comments);
    expect(pro.comments).toBeLessThan(agency.comments);

    expect(connectedAccountLimit("free")).toBeLessThan(connectedAccountLimit("starter"));
    expect(connectedAccountLimit("starter")).toBeLessThan(connectedAccountLimit("pro"));
    expect(connectedAccountLimit("pro")).toBeLessThan(connectedAccountLimit("agency"));
  });

  test("no tier is sold an action the product does not perform", () => {
    // `invites` and `likes` are columns from the retired automation engine.
    // Nothing increments them, and no plan may advertise a quota for them.
    for (const tier of ["free", "starter", "pro", "agency"] as const) {
      const limits = dailyLimitsForTier(tier);
      expect(limits.invites).toBe(0);
      expect(limits.likes).toBe(0);
    }
  });
});
