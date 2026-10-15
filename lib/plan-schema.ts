/**
 * JSON-Schema handed to Groq for structured plan output. Shared between the
 * onboarding generator and the weekly coach check-in.
 */

const PLAN_BODY = {
  type: "object",
  properties: {
    goal: { type: "string" },
    experience: { type: "string" },
    equipment: { type: "string" },
    weeklySchedule: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string" },
          sessionType: { type: "string" },
          warmUp: { type: "array", items: { type: "string" } },
          mainWorkout: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercise: { type: "string" },
                sets: { type: "integer" },
                reps: { type: "string" },
                rpe: { type: "string" },
                notes: { type: "string" },
                muscleGroup: {
                  type: "string",
                  enum: [
                    "chest",
                    "back",
                    "shoulders",
                    "arms",
                    "legs",
                    "core",
                    "cardio",
                    "full body",
                  ],
                },
              },
              required: ["exercise", "sets", "reps", "rpe", "notes", "muscleGroup"],
              additionalProperties: false,
            },
          },
          cooldown: { type: "array", items: { type: "string" } },
        },
        required: ["day", "sessionType", "warmUp", "mainWorkout", "cooldown"],
        additionalProperties: false,
      },
    },
    notes: { type: "string" },
  },
  required: ["goal", "experience", "equipment", "weeklySchedule", "notes"],
  additionalProperties: false,
} as const;

export const PLAN_JSON_SCHEMA = {
  name: "TrainingPlan",
  strict: true,
  schema: PLAN_BODY,
};

/** Same plan shape plus a coach summary of what changed and why. */
export const CHECKIN_JSON_SCHEMA = {
  name: "TrainingPlanCheckin",
  strict: true,
  schema: {
    type: "object",
    properties: {
      ...PLAN_BODY.properties,
      summary: { type: "string" },
    },
    required: [...PLAN_BODY.required, "summary"],
    additionalProperties: false,
  },
};
