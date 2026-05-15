import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callback = new URL("/callback", url.origin);
  for (const [key, value] of url.searchParams.entries()) {
    callback.searchParams.set(key, value);
  }
  return NextResponse.redirect(callback);
}
