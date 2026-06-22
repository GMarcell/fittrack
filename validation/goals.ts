import z from "zod";

export const createGoalSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(["PRIMARY", "SECONDARY"]).optional(),
  targetDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type createGoalDTO = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.partial();
