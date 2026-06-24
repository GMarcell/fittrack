import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateQuestsForUser } from "@/lib/quest";

export async function POST() {
  const user = await getCurrentUser();
  const quests = await generateQuestsForUser(user.id);
  return NextResponse.json(quests);
}
