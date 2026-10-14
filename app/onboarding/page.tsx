import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OnboardingWelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="text-center pt-8 pb-2">
          <CardTitle className="text-2xl font-semibold">
            Welcome, {user.name ?? user.email.split("@")[0]}!
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-8">
          <p className="text-sm text-muted-foreground text-center">
            Let’s set up your personal training plan. It takes about five minutes:
            tell me your goal, run a quick fitness check, and I’ll build your weekly
            training menu.
          </p>
          <div className="mt-6 space-y-3">
            <Button className="w-full" size="lg" asChild>
              <a href="/onboarding/goal">
                Start the assessment
              </a>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Your personal bests are already being tracked — the assessment just
              adds the baseline numbers I need to plan for you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
