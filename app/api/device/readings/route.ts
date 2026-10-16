import { NextResponse } from "next/server";
import { getDeviceRepo } from "@/lib/data";
import { processReading } from "@/lib/device/processReading";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 422 });
  }
  const res = await processReading(getDeviceRepo(), body, { token });
  return NextResponse.json(res.body, { status: res.status });
}
