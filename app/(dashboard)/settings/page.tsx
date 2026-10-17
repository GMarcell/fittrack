import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseEquipment } from "@/lib/onboarding";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings — PR Tracker" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { timezone: true, equipment: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your profile, timezone and available equipment
        </p>
      </div>

      <SettingsForm
        initialTimezone={record?.timezone ?? "Asia/Jakarta"}
        initialEquipment={parseEquipment(record?.equipment)}
      />

      <p className="text-xs text-muted-foreground">
        Need to change your goal or experience level?{" "}
        <Link href="/onboarding/goal" className="underline hover:text-foreground">
          Open the training questionnaire
        </Link>{" "}
        — your equipment here stays selected.
      </p>
    </div>
  );
}
