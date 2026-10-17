import { describe, it, expect } from "vitest";
import {
  ASSESSMENT_EXERCISES,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_VALUES,
  equipmentForPrompt,
  equipmentLabels,
  formatEquipment,
  parseEquipment,
  selectAssessmentExercises,
  serializeEquipment,
} from "@/lib/onboarding";

describe("parseEquipment", () => {
  it("reads a stored list in display order rather than input order", () => {
    expect(parseEquipment("bench,dumbbells")).toEqual(["dumbbells", "bench"]);
  });

  it("drops unknown and empty tokens", () => {
    expect(parseEquipment("dumbbells, ,spaceship,bench")).toEqual(["dumbbells", "bench"]);
  });

  it("returns nothing for null, undefined or blank values", () => {
    expect(parseEquipment(null)).toEqual([]);
    expect(parseEquipment(undefined)).toEqual([]);
    expect(parseEquipment("   ")).toEqual([]);
  });

  it("expands the legacy full_gym option", () => {
    const parsed = parseEquipment("full_gym");
    expect(parsed).toContain("barbell");
    expect(parsed).toContain("squat_rack");
    expect(parsed).toContain("bench");
    expect(parsed).toContain("cable_machine");
  });

  it("keeps the old single-value ids readable", () => {
    expect(parseEquipment("dumbbells")).toEqual(["dumbbells"]);
    expect(parseEquipment("bodyweight")).toEqual(["bodyweight"]);
    expect(parseEquipment("resistance_bands")).toEqual(["resistance_bands"]);
  });

  it("accepts every current option", () => {
    expect(parseEquipment(EQUIPMENT_VALUES.join(","))).toEqual([...EQUIPMENT_VALUES]);
  });
});

describe("serializeEquipment", () => {
  it("dedupes and normalizes to a stable comma-separated list", () => {
    expect(serializeEquipment(["bench", "dumbbells", "bench"])).toBe("dumbbells,bench");
  });

  it("normalizes legacy values into the granular ids", () => {
    const stored = serializeEquipment(["full_gym"]);
    expect(stored).toContain("barbell");
    expect(stored).not.toContain("full_gym");
  });

  it("round-trips", () => {
    const stored = serializeEquipment(["dumbbells", "pull_up_bar", "rower"]);
    expect(parseEquipment(stored)).toEqual(["dumbbells", "pull_up_bar", "rower"]);
  });
});

describe("equipmentLabels / formatEquipment", () => {
  it("uses the human labels for the stored ids", () => {
    expect(equipmentLabels("dumbbells,bench")).toEqual(["Dumbbells", "Flat bench"]);
  });

  it("falls back to bodyweight-only wording when nothing is stored", () => {
    expect(formatEquipment(null)).toBe("Bodyweight only");
    expect(formatEquipment("unknown")).toBe("Bodyweight only");
  });

  it("joins multiple options for plan headers", () => {
    expect(formatEquipment("dumbbells,bench")).toBe("Dumbbells, Flat bench");
  });

  it("has a unique label per option", () => {
    const labels = EQUIPMENT_OPTIONS.map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("selectAssessmentExercises", () => {
  const ids = (goal: string, equipment: string) =>
    selectAssessmentExercises(goal, equipment).map((e) => e.id);

  it("always ends with the bodyweight reading and has no duplicates", () => {
    for (const goal of ["strength", "endurance", "weight_loss", "general_fitness"]) {
      const selected = selectAssessmentExercises(goal, "dumbbells,rower");
      expect(selected[selected.length - 1].id).toBe("bodyweight");
      expect(new Set(selected.map((e) => e.id)).size).toBe(selected.length);
      expect(selected.length).toBeLessThanOrEqual(4);
    }
  });

  it("matches the old default flow for general fitness without equipment", () => {
    expect(ASSESSMENT_EXERCISES.map((e) => e.id)).toEqual([
      "max_pushups",
      "max_squats",
      "plank_hold",
      "bodyweight",
    ]);
  });

  it("tests endurance clients on the cardio machine they own", () => {
    expect(ids("endurance", "rower")).toContain("row_500m");
    expect(ids("endurance", "rower,rower")).not.toContain("run_1000m");
    expect(ids("endurance", "stationary_bike")).toContain("bike_1000m");
  });

  it("falls back to an outdoor run when no cardio machine is listed", () => {
    expect(ids("endurance", "dumbbells")).toContain("run_1000m");
  });

  it("adds pull-ups only when there is a bar", () => {
    expect(ids("strength", "pull_up_bar,barbell")).toContain("max_pullups");
    expect(ids("strength", "barbell,bench")).not.toContain("max_pullups");
  });

  it("adds a loaded carry for strength clients with free weights", () => {
    expect(ids("strength", "dumbbells")).toContain("farmer_carry");
    expect(ids("strength", "bodyweight")).not.toContain("farmer_carry");
  });

  it("prioritises cardio for fat-loss clients", () => {
    expect(ids("weight_loss", "jump_rope")[0]).toBe("run_1000m");
  });

  it("honours a smaller performance-test limit", () => {
    const selected = selectAssessmentExercises("strength", "dumbbells", 2);
    expect(selected).toHaveLength(3);
    expect(selected[selected.length - 1].id).toBe("bodyweight");
  });
});

describe("equipmentForPrompt", () => {
  it("tells the model what is available and that bodyweight is always allowed", () => {
    const prompt = equipmentForPrompt("dumbbells,bench");
    expect(prompt).toContain("Dumbbells, Flat bench");
    expect(prompt).toContain("Bodyweight exercises are always available");
  });

  it("handles an empty profile", () => {
    expect(equipmentForPrompt(null)).toContain("bodyweight only");
  });
});
