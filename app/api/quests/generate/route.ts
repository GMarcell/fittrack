import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateQuestsForUser } from "@/lib/quest";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quests = await generateQuestsForUser(user.id);
  return NextResponse.json(quests);
}
