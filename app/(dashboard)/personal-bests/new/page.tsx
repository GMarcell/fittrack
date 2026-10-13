import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PersonalBestForm } from "@/components/personal-bests/personal-best-form";
import { getCurrentUser } from "@/lib/auth";
import type { PersonalBestTypeValue } from "@/lib/personal-best";

export const metadata: Metadata = {
  title: "Log PR — PR Tracker",
};

export default async function NewPersonalBestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;
  const defaultType: PersonalBestTypeValue =
    type === "BODY_METRIC" ? "BODY_METRIC" : "EXERCISE";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Log an entry</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Record a personal best or a body measurement. Logging the same record
          again adds to its history.
        </p>
      </div>

      <PersonalBestForm defaultType={defaultType} />
    </div>
  );
}
