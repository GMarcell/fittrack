import { z } from "zod";

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

export type createExerciseDTO = z.infer<typeof createExerciseSchema>;

export const updateExerciseSchema = createExerciseSchema.partial();
