"use client";

import { EQUIPMENT_OPTIONS } from "@/lib/onboarding";

const EQUIPMENT_GROUPS = [
  "Free weights",
  "Bodyweight & portable",
  "Machines",
  "Cardio",
] as const;

export function EquipmentSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  return (
    <div className="mt-2 space-y-3">
      {EQUIPMENT_GROUPS.map((group) => (
        <div key={group}>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.filter((option) => option.group === group).map(
              (option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg border border-input bg-background/50 p-3 text-sm cursor-pointer transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="equipment"
                    value={option.value}
                    checked={value.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    className="mt-0.5"
                  />
                  {option.label}
                </label>
              ),
            )}
          </div>
        </div>
      ))}
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nothing selected yet. Pick “Bodyweight only” if you train without kit.
        </p>
      )}
    </div>
  );
}
