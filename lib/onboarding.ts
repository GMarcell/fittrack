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

export type Equipment = "bodyweight" | "dumbbells" | "full_gym" | "resistance_bands";

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "bodyweight", label: "Bodyweight only" },
  { value: "dumbbells", label: "Dumbbells / kettlebell" },
  { value: "full_gym", label: "Full gym" },
  { value: "resistance_bands", label: "Resistance bands" },
];

export const ASSESSMENT_EXERCISES = [
  {
    id: "max_pushups",
    name: "Max push-ups",
    unit: "REPS" as const,
    direction: "HIGHER" as const,
    instructions: "Do as many strict push-ups as you can in one set. Stop when form breaks.",
    rest: "2 minutes",
  },
  {
    id: "max_squats",
    name: "Max bodyweight squats",
    unit: "REPS" as const,
    direction: "HIGHER" as const,
    instructions: "Feet shoulder-width, chest up. Do as many as you can with good depth.",
    rest: "2 minutes",
  },
  {
    id: "plank_hold",
    name: "Plank hold",
    unit: "SECONDS" as const,
    direction: "HIGHER" as const,
    instructions: "Forearms on the floor, body in a straight line. Hold as long as you can.",
    rest: "90 seconds",
  },
  {
    id: "bodyweight",
    name: "Bodyweight",
    unit: "KG" as const,
    direction: "LATEST" as const,
    instructions: "Step on a scale and enter your current weight in kg.",
    rest: null,
  },
] as const;

export type AssessmentExercise = (typeof ASSESSMENT_EXERCISES)[number];
