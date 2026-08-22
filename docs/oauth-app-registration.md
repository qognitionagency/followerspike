# Registering the X and LinkedIn OAuth apps

**Status: the code is built and waiting. Both platforms need an application
registered in their developer console, and neither can be created from this
repo. As of August 2026 both also have an approval gate that no amount of
configuration gets around.**

What already exists:

- `lib/platforms/oauth.ts` builds the authorization URL and exchanges the code
- `app/api/connect/[platform]/start` and `/callback` run the handshake, with
  PKCE on X and a state-cookie CSRF check on both
- `lib/platforms/connect.ts` encrypts and stores the tokens
- `/app/accounts` hides each platform until its client id and secret exist, so
  there is no broken button while you wait

Set the four variables and the buttons appear. Nothing else changes.

---

## Callback URLs

Register these **exactly**, on your custom domain. A trailing slash or an
`http://` scheme will be rejected at the token exchange, and the error comes
back as a generic redirect failure that is hard to read.

    https://<your-domain>/api/connect/x/callback
    https://<your-domain>/api/connect/linkedin/callback

For local testing, X permits `http://127.0.0.1:3000/api/connect/x/callback`
(use the IP, not `localhost`). LinkedIn requires HTTPS even in development, so
test that one against a deployed preview or a tunnel.

---

## X

**Console:** developer.x.com → Projects & Apps → your app → User authentication
settings.

**Settings**

| Field | Value |
| --- | --- |
| App permissions | Read and write |
| Type of App | Web App / Automated App or Bot (a *confidential* client) |
| Callback URI | `https://<your-domain>/api/connect/x/callback` |
| Website URL | your domain |

**Scopes requested by the code:** `tweet.read`, `tweet.write`, `users.read`,
`offline.access`.

`offline.access` is the one to check. Without it X issues no refresh token, and
because X access tokens live two hours, the connection dies silently that
afternoon with no way back except reconnecting by hand.

**Variables**

    X_CLIENT_ID=
    X_CLIENT_SECRET=

Take these from **Keys and tokens → OAuth 2.0 Client ID and Client Secret**.
They are not the API Key/Secret and not the Bearer Token.

**The gate:** posting requires a paid API tier. The Free tier is read-and-
post-limited in ways that will not carry this product, so expect to be on Basic
or above before `tweet.write` behaves. Confirm the current tier limits on X's
pricing page before committing, since they have changed repeatedly.

---

## LinkedIn

**Console:** linkedin.com/developers → your app → Auth tab.

**Settings**

| Field | Value |
| --- | --- |
| Authorized redirect URL | `https://<your-domain>/api/connect/linkedin/callback` |
| App logo, privacy policy URL, legal agreement | required before review |

Point the privacy policy field at `https://<your-domain>/privacy`, which exists
and is written.

**Scopes requested by the code:** `openid`, `profile`, `w_member_social`.

`openid` and `profile` come from the **Sign In with LinkedIn using OpenID
Connect** product and are usually granted immediately. They are what
`/v2/userinfo` needs, which is how `fetchProfile` resolves the member id.

`w_member_social` comes from the **Share on LinkedIn** product and is the one
that allows posting.

**Variables**

    LINKEDIN_CLIENT_ID=
    LINKEDIN_CLIENT_SECRET=
    LINKEDIN_API_VERSION=202506

`LINKEDIN_API_VERSION` is the `LinkedIn-Version` header the REST Posts API
requires, in `YYYYMM` form. LinkedIn deprecates versions on a rolling window, so
this needs bumping periodically; the adapter sends whatever is set here.

**The gate:** `w_member_social` requires app review. You request the Share on
LinkedIn product and LinkedIn verifies the company page behind the app. Budget
days, not minutes, and note that a *company page* must exist and be verified
before the app can request products at all.

---

## Verifying a connection end to end

Once the variables are set in Vercel and redeployed:

1. Sign in and open `/app/accounts`. X and LinkedIn now show a Connect button
   instead of the unavailable notice.
2. Press Connect. You should land on the platform's consent screen. If you get
   bounced straight back with `?connect=unconfigured`, the client id or secret
   is missing on the server.
3. Approve. You should return to `/app/accounts?connect=connected` with the
   account listed and marked Active.
4. If you return with `?connect=invalid_state`, the handshake cookies expired or
   were not sent. They live ten minutes and are scoped to
   `/api/connect/<platform>`, so a slow consent screen or a domain mismatch is
   the usual cause.
5. If you return with `?connect=error`, the token exchange or the profile read
   failed. The detail is in `/admin/errors` under source `api/connect/callback`,
   which is the reason that error log exists.

## What connection does not require

Bluesky. It authenticates with a per-user app password against a public API,
needs no registered application, and works today.
