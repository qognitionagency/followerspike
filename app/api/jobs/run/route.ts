/**
 * Runs exactly one job.
 *
 * Reached only through a QStash message published by /api/cron/dispatch, and
 * verified with the same signature check — this endpoint executes real work on
 * a customer's connected accounts, so it is the last place in the app that may
 * be reachable unauthenticated.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getJob, verifyQStashSignature } from "@/lib/jobs/queue";
import { runJob } from "@/lib/jobs/handlers";

// Node, not edge: signature verification needs crypto, and handlers are server-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  jobId: z.string().uuid(),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!(await verifyQStashSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid job payload" }, { status: 400 });
  }

  try {
    const job = await getJob(parsed.data.jobId);
    if (!job) {
      // QStash keeps retrying a 5xx, and a job that no longer exists will never
      // start existing. 200 so the message is retired.
      return NextResponse.json({ ran: false, reason: "unknown" });
    }

    // QStash redelivers, and the lease reaper can hand a row back to `pending`
    // while a slow message is still in flight. Only a row this dispatcher still
    // holds the claim on may run.
    if (job.status !== "claimed") {
      return NextResponse.json({ ran: false, reason: "not_claimed", status: job.status });
    }

    const result = await runJob(job);
    // 200 either way: the outcome is already durable in `jobs`, and a QStash
    // retry would run the job a second time rather than fix anything.
    return NextResponse.json({ ran: true, ok: result.ok });
  } catch {
    return NextResponse.json({ error: "Job execution failed" }, { status: 500 });
  }
}
