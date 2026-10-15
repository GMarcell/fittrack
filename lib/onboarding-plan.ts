export interface PlanBaseline {
  assessments: Array<{ name: string; value: number; unit: string }>;
}

export function baselineCard(baseline: PlanBaseline): string {
  const assessments = baseline.assessments;
  if (assessments.length === 0) {
    return (
      `<div class="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">` +
      `<p class="font-medium text-foreground mb-1">Your baseline</p>` +
      `<p>No assessment results yet. Complete the fitness checks to see where you're starting from.</p>` +
      `</div>`
    );
  }

  let html = `<div class="rounded-lg border border-border bg-card p-4 text-sm">`;
  html += `<p class="font-medium text-foreground mb-2">Your baseline</p>`;
  html += `<ul class="space-y-1.5 pl-4 list-disc marker:text-muted-foreground">`;
  for (const a of assessments) {
    html += `<li><span class="font-medium">${escapeHtml(a.name)}</span>: ${a.value} ${escapeHtml(a.unit)}</li>`;
  }
  html += `</ul>`;
  html += `</div>`;
  return html;
}

export function planToHtml(plan: {
  goal: string;
  experience: string;
  equipment: string;
  weeklySchedule: Array<{
    day: string;
    sessionType: string;
    warmUp?: string[] | null;
    mainWorkout: Array<{
      exercise: string;
      sets: number;
      reps: string;
      rpe?: string;
      notes?: string;
      muscleGroup?: string;
    }>;
    cooldown?: string[] | null;
  }>;
  notes: string;
  _baselineHtml?: string;
}): string {
  const dayLabels: Record<string, string> = {
    Monday: "Monday",
    Tuesday: "Tuesday",
    Wednesday: "Wednesday",
    Thursday: "Thursday",
    Friday: "Friday",
    Saturday: "Saturday",
    Sunday: "Sunday",
    rest: "Rest day",
  };

  let html = `<div class="space-y-4">`;
  html += `<div class="rounded-lg bg-primary/10 border border-primary/20 p-4 text-sm">`;
  html += `<p class="font-medium text-primary">Goal: ${escapeHtml(plan.goal)} · ${escapeHtml(plan.experience)} level · ${escapeHtml(plan.equipment)}</p>`;
  html += `</div>`;

  for (const day of plan.weeklySchedule) {
    const label = dayLabels[day.day] ?? day.day;
    html += `<div class="rounded-lg border border-border bg-card p-4 space-y-3">`;
    html += `<div class="flex items-center justify-between">`;
    html += `<h3 class="font-semibold text-foreground">${escapeHtml(label)}</h3>`;
    html += `<span class="text-xs text-muted-foreground">${escapeHtml(day.sessionType)}</span>`;
    html += `</div>`;

    html += `<div class="text-xs text-muted-foreground space-y-1">`;
    const warmUp = day.warmUp ?? undefined;
    const cooldown = day.cooldown ?? undefined;
    html += `<p><span class="text-foreground font-medium">Warm-up:</span> ${warmUp?.map((w) => escapeHtml(w)).join(", ") ?? "—"}</p>`;
    html += `<p><span class="text-foreground font-medium">Cool-down:</span> ${cooldown?.map((c) => escapeHtml(c)).join(", ") ?? "—"}</p>`;
    html += `</div>`;

    html += `<ul class="space-y-2 pl-4 list-disc marker:text-muted-foreground text-sm">`;
    for (const ex of day.mainWorkout) {
      const rpe = ex.rpe ? ` · ${escapeHtml(ex.rpe)}` : "";
      const notes = ex.notes ? ` — ${escapeHtml(ex.notes)}` : "";
      const group = ex.muscleGroup
        ? ` <span class="rounded border border-border px-1 text-[10px] capitalize text-muted-foreground">${escapeHtml(ex.muscleGroup)}</span>`
        : "";
      html += `<li><span class="font-medium">${escapeHtml(ex.exercise)}</span>${group} — ${ex.sets}×${escapeHtml(ex.reps)}${rpe}${notes}</li>`;
    }
    html += `</ul>`;

    html += `</div>`;
  }

  html += `<div class="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">`;
  html += `<p class="font-medium text-foreground mb-1">Notes</p>`;
  html += `<p>${escapeHtml(plan.notes)}</p>`;
  html += `</div>`;

  html += `</div>`;

  const baseline = plan._baselineHtml;
  if (baseline) {
    html = baseline + html;
  }

  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
