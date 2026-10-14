import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <main className="min-h-screen bg-background">{children}</main>;
}
