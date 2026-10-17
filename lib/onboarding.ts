export type FitnessGoal =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "weight_loss"
  | "general_fitness";

export const FITNESS_GOALS: { value: FitnessGoal; label: string; description: string }[] = [
  { value: "strength", label: "Strength", description: "Get stronger on the big lifts" },
  { value: "hypertrophy", label: "Muscle", description: "Build size and shape" },
  { value: "endurance", label: "Endurance", description: "Run/row longer and faster" },
  { value: "weight_loss", label: "Fat loss", description: "Drop body fat while keeping muscle" },
  { value: "general_fitness", label: "General fitness", description: "Stay fit, mobile and healthy" },
];

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export type Equipment =
  | "bodyweight"
  | "dumbbells"
  | "kettlebell"
  | "barbell"
  | "squat_rack"
  | "bench"
  | "pull_up_bar"
  | "resistance_bands"
  | "jump_rope"
  | "medicine_ball"
  | "cable_machine"
  | "machines"
  | "treadmill"
  | "rower"
  | "stationary_bike";

export const EQUIPMENT_OPTIONS: {
  value: Equipment;
  label: string;
  group: "Free weights" | "Bodyweight & portable" | "Machines" | "Cardio";
}[] = [
  { value: "barbell", label: "Barbell & plates", group: "Free weights" },
  { value: "squat_rack", label: "Squat rack / power cage", group: "Free weights" },
  { value: "dumbbells", label: "Dumbbells", group: "Free weights" },
  { value: "kettlebell", label: "Kettlebell", group: "Free weights" },
  { value: "bench", label: "Flat bench", group: "Free weights" },
  { value: "medicine_ball", label: "Medicine ball", group: "Free weights" },
  { value: "bodyweight", label: "Bodyweight only", group: "Bodyweight & portable" },
  { value: "pull_up_bar", label: "Pull-up bar", group: "Bodyweight & portable" },
  { value: "resistance_bands", label: "Resistance bands", group: "Bodyweight & portable" },
  { value: "jump_rope", label: "Jump rope", group: "Bodyweight & portable" },
  { value: "cable_machine", label: "Cable machine", group: "Machines" },
  { value: "machines", label: "Gym machines", group: "Machines" },
  { value: "treadmill", label: "Treadmill", group: "Cardio" },
  { value: "rower", label: "Rowing machine", group: "Cardio" },
  { value: "stationary_bike", label: "Stationary bike", group: "Cardio" },
];

export const EQUIPMENT_VALUES = EQUIPMENT_OPTIONS.map((o) => o.value) as [
  Equipment,
  ...Equipment[],
];

const LEGACY_EQUIPMENT: Record<string, Equipment[]> = {
  // "bodyweight", "dumbbells" and "resistance_bands" were also old single
  // options, but they are valid current ids too, so they need no expansion.
  full_gym: [
    "barbell",
    "squat_rack",
    "dumbbells",
    "kettlebell",
    "bench",
    "pull_up_bar",
    "resistance_bands",
    "cable_machine",
    "machines",
    "treadmill",
    "rower",
    "stationary_bike",
  ],
};

/**
 * Equipment is stored as a comma-separated list of stable ids on `User` and
 * `TrainingPlan`. This accepts both that list and the single coarse value used
 * by the first version of onboarding (e.g. "full_gym"), so old rows keep working.
 */
export function parseEquipment(value: string | null | undefined): Equipment[] {
  if (!value) return [];

  const known = new Set(EQUIPMENT_VALUES);
  const found = new Set<Equipment>();
  for (const raw of value.split(",")) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;
    if (known.has(token as Equipment)) {
      found.add(token as Equipment);
    } else {
      for (const legacy of LEGACY_EQUIPMENT[token] ?? []) found.add(legacy);
    }
  }

  // Preserve the display order rather than the order ids happened to be stored.
  return EQUIPMENT_VALUES.filter((id) => found.has(id));
}

/** Stable storage form: comma-separated ids in display order, no duplicates. */
export function serializeEquipment(values: string[] | null | undefined): string {
  return parseEquipment((values ?? []).join(",")).join(",");
}

export function equipmentLabels(value: string | null | undefined): string[] {
  const ids = parseEquipment(value);
  return ids
    .map((id) => EQUIPMENT_OPTIONS.find((o) => o.value === id)?.label)
    .filter((label): label is string => Boolean(label));
}

/** Human-readable list for plan headers and UI, e.g. "Dumbbells, Flat bench". */
export function formatEquipment(value: string | null | undefined): string {
  const labels = equipmentLabels(value);
  return labels.length > 0 ? labels.join(", ") : "Bodyweight only";
}

/** The exact line handed to the coach so it only programs available equipment. */
export function equipmentForPrompt(value: string | null | undefined): string {
  const labels = equipmentLabels(value);
  const available = labels.length > 0 ? labels.join(", ") : "bodyweight only";
  return `${available}. Bodyweight exercises are always available.`;
}

export type AssessmentGroup = "strength" | "core" | "cardio" | "body";

export interface AssessmentExercise {
  id: string;
  name: string;
  unit: "REPS" | "SECONDS" | "METERS" | "KM" | "KG";
  direction: "HIGHER" | "LOWER" | "LATEST";
  instructions: string;
  rest: string | null;
  group: AssessmentGroup;
  /** Equipment ids that make this test possible; empty means floor/outdoors. */
  requires?: Equipment[];
}

/**
 * Fitness-check question bank. The onboarding flow picks a small subset that
 * makes sense for the client's goal and kit rather than testing everyone on
 * push-ups and a plank.
 */
export const ASSESSMENT_EXERCISE_BANK: AssessmentExercise[] = [
  {
    id: "max_pushups",
    name: "Max push-ups",
    unit: "REPS",
    direction: "HIGHER",
    group: "strength",
    instructions: "Do as many strict push-ups as you can in one set. Stop when form breaks.",
    rest: "2 minutes",
  },
  {
    id: "max_squats",
    name: "Max bodyweight squats",
    unit: "REPS",
    direction: "HIGHER",
    group: "strength",
    instructions: "Feet shoulder-width, chest up. Do as many as you can with good depth.",
    rest: "2 minutes",
  },
  {
    id: "plank_hold",
    name: "Plank hold",
    unit: "SECONDS",
    direction: "HIGHER",
    group: "core",
    instructions: "Forearms on the floor, body in a straight line. Hold as long as you can.",
    rest: "90 seconds",
  },
  {
    id: "max_pullups",
    name: "Max pull-ups",
    unit: "REPS",
    direction: "HIGHER",
    group: "strength",
    requires: ["pull_up_bar"],
    instructions: "From a dead hang, do as many strict pull-ups as you can. Stop when form breaks.",
    rest: "2 minutes",
  },
  {
    id: "farmer_carry",
    name: "Farmer carry hold",
    unit: "SECONDS",
    direction: "HIGHER",
    group: "strength",
    requires: ["dumbbells", "kettlebell"],
    instructions:
      "Pick up the heaviest dumbbells or kettlebells you can hold safely at your sides and hold them for as long as possible. Stop before your grip fails completely.",
    rest: "2 minutes",
  },
  {
    id: "jump_rope_60s",
    name: "Jump rope · 60 seconds",
    unit: "REPS",
    direction: "HIGHER",
    group: "cardio",
    requires: ["jump_rope"],
    instructions: "Skip for 60 seconds and enter the number of successful jumps. Stop early if you trip and restart the clock once.",
    rest: "2 minutes",
  },
  {
    id: "run_1000m",
    name: "1 km run",
    unit: "SECONDS",
    direction: "LOWER",
    group: "cardio",
    instructions:
      "Warm up, then run 1 km as fast as you can — on a treadmill or outdoors. Enter your time in seconds.",
    rest: "3 minutes after a walk-in warm-up",
  },
  {
    id: "row_500m",
    name: "500 m row",
    unit: "SECONDS",
    direction: "LOWER",
    group: "cardio",
    requires: ["rower"],
    instructions: "Warm up, then row 500 m as fast as you can. Enter your time in seconds.",
    rest: "3 minutes after an easy warm-up",
  },
  {
    id: "bike_1000m",
    name: "1 km bike",
    unit: "SECONDS",
    direction: "LOWER",
    group: "cardio",
    requires: ["stationary_bike"],
    instructions: "Warm up, then ride 1 km on the stationary bike as fast as you can. Enter the time in seconds.",
    rest: "3 minutes after an easy warm-up",
  },
  {
    id: "bodyweight",
    name: "Bodyweight",
    unit: "KG",
    direction: "LATEST",
    group: "body",
    instructions: "Step on a scale and enter your current weight in kg.",
    rest: null,
  },
];

export function assessmentExerciseById(id: string): AssessmentExercise | undefined {
  return ASSESSMENT_EXERCISE_BANK.find((exercise) => exercise.id === id);
}

function canPerform(exercise: AssessmentExercise, equipment: Equipment[]): boolean {
  if (!exercise.requires || exercise.requires.length === 0) return true;
  return exercise.requires.some((required) => equipment.includes(required));
}

function cardioTestFor(equipment: Equipment[]): AssessmentExercise {
  if (equipment.includes("rower")) return assessmentExerciseById("row_500m")!;
  if (equipment.includes("stationary_bike")) return assessmentExerciseById("bike_1000m")!;
  // Running is always possible outdoors, whether or not a treadmill is listed.
  return assessmentExerciseById("run_1000m")!;
}

/**
 * Chooses the assessment: up to three performance tests matched to the goal
 * and available equipment, plus a bodyweight reading. Endurance clients get a
 * row/bike/run test; lifters get pull-ups or a loaded carry when the kit allows.
 *
 * Results are always feasible for the given equipment and always end with the
 * bodyweight entry.
 */
export function selectAssessmentExercises(
  goal: string | null | undefined,
  equipmentValue: string | null | undefined,
  performanceTestLimit = 3,
): AssessmentExercise[] {
  const equipment = parseEquipment(equipmentValue);
  const exercises: AssessmentExercise[] = [];

  const add = (exercise: AssessmentExercise) => {
    if (!canPerform(exercise, equipment)) return;
    if (exercises.some((e) => e.id === exercise.id)) return;
    exercises.push(exercise);
  };

  const pushups = assessmentExerciseById("max_pushups")!;
  const squats = assessmentExerciseById("max_squats")!;
  const plank = assessmentExerciseById("plank_hold")!;
  const pullups = assessmentExerciseById("max_pullups")!;
  const carry = assessmentExerciseById("farmer_carry")!;
  const cardio = cardioTestFor(equipment);

  switch (goal) {
    case "endurance":
      add(cardio);
      add(pushups);
      add(plank);
      break;
    case "strength":
    case "hypertrophy":
      add(pushups);
      add(squats);
      add(pullups);
      add(carry);
      add(plank);
      break;
    case "weight_loss":
      add(cardio);
      add(pushups);
      add(squats);
      break;
    default:
      add(pushups);
      add(squats);
      add(plank);
      break;
  }

  const bodyweight = assessmentExerciseById("bodyweight")!;
  return [...exercises.slice(0, performanceTestLimit), bodyweight];
}

/** Fallback flow used before the onboarding context has loaded. */
export const ASSESSMENT_EXERCISES = selectAssessmentExercises(
  "general_fitness",
  "bodyweight",
);
