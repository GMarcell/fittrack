import { NextResponse } from "next/server";
import { runQuestFailureSweep } from "@/lib/quest-sweep";

// Vercel calls this on a schedule — protected by a secret token
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runQuestFailureSweep();
  return NextResponse.json({ ok: true, ...result });
}
