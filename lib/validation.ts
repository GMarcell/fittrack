import z from "zod";

export const createBenchmarkSchema = z.object({
  metric: z.string().min(1),
  value: z.number(),
  unit: z.enum([
    "REPS",
    "SECONDS",
    "MINUTES",
    "METERS",
    "KM",
    "KG",
    "LB",
    "COUNT",
  ]),
  date: z.coerce.date().optional(),
});

export const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    "STRENGTH",
    "CONDITIONING",
    "SKILL",
    "FLEXIBILITY",
    "OTHER",
  ]),
  unit: z.enum([
    "REPS",
    "SECONDS",
    "MINUTES",
    "METERS",
    "KM",
    "KG",
    "LB",
    "COUNT",
  ]),
});

export const statBoostSchema = z.object({
  type: z.enum(["STR", "END", "AGI", "SPD", "PWR", "FLX", "VIT", "DSC"]),
  value: z.number().min(1).max(3),
});

export const sessionExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  value: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const createSessionSchema = z.object({
  date: z.coerce.date(),
  activityTypeId: z.string(),
  goalId: z.string().optional().nullable(),
  focus: z.string().optional(),
  duration: z.number().int().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
  sessionExercises: z.array(sessionExerciseSchema).optional(),
  statBoosts: z.array(statBoostSchema).optional(),
});

export const createGoalSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(["PRIMARY", "SECONDARY"]).optional(),
  targetDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type createGoalDTO = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.partial();

export type CreateSessionDto = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = createSessionSchema.partial();

export type createExerciseDTO = z.infer<typeof createExerciseSchema>;

export const updateExerciseSchema = createExerciseSchema.partial();

export type CreateBenchmarkDto = z.infer<typeof createBenchmarkSchema>;
