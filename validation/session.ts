import z from "zod";

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
  goalId: z.string().optional(),
  focus: z.string().optional(),
  duration: z.number().int().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
  sessionExercises: z.array(sessionExerciseSchema).optional(),
});

export type CreateSessionDto = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = createSessionSchema.partial();
