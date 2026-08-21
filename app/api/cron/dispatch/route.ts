/**
 * The scheduler tick.
 *
 * QStash calls this on a schedule; it claims whatever is due and hands each
 * claimed job onward as its own signed message to /api/jobs/run. Nothing is
 * executed here when QStash is available, precisely so that a backlog cannot
 * push a single invocation into the function timeout and take the whole batch
 * down with it.
 *
 * The previous incarnation of this endpoint was deleted rather than left
 * unauthenticated, and an e2e test asserts it answers 401 or 404 and never 200
 * without a signature. That test is the contract this file has to keep.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { claimDue, publishJobMessage, qstashPublishConfigured, reapExpiredLeases, verifyQStashSignature, fail } from "@/lib/jobs/queue";
import { runJob } from "@/lib/jobs/handlers";
import { sweepRecurringWork } from "@/lib/jobs/schedule";

// Node, not edge: signature verification needs the crypto primitives, and the
// handlers this can run inline are server-only throughout.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One tick's worth. Enough to drain a normal backlog, small enough that the fan-out itself stays quick. */
const DEFAULT_BATCH = 25;
const MAX_BATCH = 100;

const bodySchema = z.object({
  limit: z.number().int().positive().max(MAX_BATCH).optional(),
});

export async function POST(request: Request) {
  // Raw body first, exactly as the Razorpay webhook does: the signature covers
  // these bytes, so nothing may parse or trust them before it is verified.
  const rawBody = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!(await verifyQStashSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsedBody: unknown = {};
  if (rawBody.trim().length > 0) {
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const parsed = bodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dispatch payload" }, { status: 400 });
  }

  try {
    // Before claiming, not after: a job orphaned by a killed runner is due
    // again and should go out in this tick rather than waiting for the next.
    const reaped = await reapExpiredLeases();

    // Also before claiming, so anything the calendar has just made due goes out
    // in this tick. The sweep is keyed per period, not per tick, so calling it
    // every time costs two indexed queries and enqueues nothing.
    const swept = await sweepRecurringWork();

    const jobs = await claimDue(parsed.data.limit ?? DEFAULT_BATCH);

    if (!qstashPublishConfigured()) {
      // Local and preview deployments with no QStash account still need the
      // path to work end to end. Signature verification above already ran —
      // this branch changes where the work happens, never whether it is
      // authorized.
      const results = await Promise.all(jobs.map((job) => runJob(job)));
      return NextResponse.json({
        mode: "inline",
        reaped,
        swept,
        claimed: jobs.length,
        succeeded: results.filter((result) => result.ok).length,
      });
    }

    let dispatched = 0;
    for (const job of jobs) {
      try {
        await publishJobMessage(job);
        dispatched += 1;
      } catch (error) {
        // The row is claimed and would otherwise sit until its lease lapses.
        // Releasing it now puts it back in the next tick with a backoff.
        await fail(job.id, error);
      }
    }

    return NextResponse.json({ mode: "qstash", reaped, swept, claimed: jobs.length, dispatched });
  } catch {
    return NextResponse.json({ error: "Dispatch failed" }, { status: 500 });
  }
}
