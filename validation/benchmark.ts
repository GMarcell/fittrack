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

export type CreateBenchmarkDto = z.infer<typeof createBenchmarkSchema>;
