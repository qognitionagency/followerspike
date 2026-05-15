import { createHmac, timingSafeEqual } from "crypto";
import { optionalEnv } from "@/lib/env";
import type { WorkerJob } from "@/lib/types";

export type WorkerDispatchResult = {
  delivered: boolean;
  status: number;
  body: string;
};

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWorkerSignature(payload: string, signature: string | null): boolean {
  const secret = optionalEnv("WORKER_SHARED_SECRET");
  if (!secret || !signature) return false;
  const expected = signPayload(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function dispatchWorkerJob(job: WorkerJob): Promise<WorkerDispatchResult> {
  const endpoint = optionalEnv("WORKER_ENDPOINT_URL");
  const secret = optionalEnv("WORKER_SHARED_SECRET");
  if (!endpoint || !secret) {
    return {
      delivered: false,
      status: 0,
      body: "Worker endpoint or shared secret is not configured",
    };
  }

  const payload = JSON.stringify(job);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-followerspike-signature": signPayload(payload, secret),
    },
    body: payload,
  });

  return {
    delivered: response.ok,
    status: response.status,
    body: await response.text(),
  };
}
