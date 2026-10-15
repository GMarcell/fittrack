/**
 * Coarse muscle-group classification used for volume tracking and coverage
 * analysis. Deliberately keyword-based: exercises are free-text in plans, and
 * an unknown name simply ends up unclassified rather than wrong.
 */

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "cardio",
  "full body",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
  cardio: "Cardio",
  "full body": "Full body",
};

const KEYWORDS: Array<[MuscleGroup, string[]]> = [
  ["chest", ["push-up", "pushup", "bench press", "bench", "fly", "dip", "chest"]],
  ["back", ["pull-up", "pullup", "chin-up", "row", "pull", "lat", "back extension", "deadlift", "pulldown", "face pull"]],
  ["shoulders", ["overhead press", "shoulder press", "military press", "lateral raise", "front raise", "shrug", "pike push", "handstand push", "ohp"]],
  ["arms", ["curl", "triceps", "biceps", "skull crusher", "kickback", "hammer curl", "close-grip"]],
  ["legs", ["squat", "lunge", "deadlift", "hip thrust", "leg press", "leg extension", "leg curl", "calf", "step-up", "bulgarian", "glute", "hamstring", "quadriceps"]],
  ["core", ["plank", "crunch", "sit-up", "situp", "leg raise", "russian twist", "abdominal", "abs", "hollow", "side bend"]],
  ["cardio", ["run", "sprint", "jog", "cycle", "bike", "row erg", "jump rope", "skipping", "swim", "burpee", "mountain climber", "high knees", "walking"]],
  ["full body", ["thruster", "clean", "snatch", "kettlebell swing", "swing", "man maker", "turkish get-up"]],
];

export function classifyExercise(name: string): MuscleGroup | null {
  const lower = name.toLowerCase();
  for (const [group, words] of KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return group;
  }
  return null;
}
