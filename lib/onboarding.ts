import { StatType } from "@prisma/client";

export type QuestionKey =
  | "max_pushups"
  | "max_pullups"
  | "five_k_run"
  | "sprint_ability"
  | "flexibility"
  | "training_days"
  | "recovery_speed"
  | "coordination";

export type AnswerBand = "A" | "B" | "C" | "D";

export const QUESTIONS = [
  {
    key: "max_pushups" as QuestionKey,
    question: "Max push-ups in one set, no rest?",
    options: [
      { band: "A" as AnswerBand, label: "0–5" },
      { band: "B" as AnswerBand, label: "6–15" },
      { band: "C" as AnswerBand, label: "16–30" },
      { band: "D" as AnswerBand, label: "31+" },
    ],
    stats: [StatType.STR],
  },
  {
    key: "max_pullups" as QuestionKey,
    question: "Max pull-ups (or assisted/negative if 0)?",
    options: [
      { band: "A" as AnswerBand, label: "0" },
      { band: "B" as AnswerBand, label: "1–3" },
      { band: "C" as AnswerBand, label: "4–8" },
      { band: "D" as AnswerBand, label: "9+" },
    ],
    stats: [StatType.STR],
  },
  {
    key: "five_k_run" as QuestionKey,
    question: "Can you run 5km without stopping?",
    options: [
      { band: "A" as AnswerBand, label: "No" },
      { band: "B" as AnswerBand, label: "Yes, 30+ min" },
      { band: "C" as AnswerBand, label: "Yes, 25–30 min" },
      { band: "D" as AnswerBand, label: "Yes, under 25 min" },
    ],
    stats: [StatType.END],
  },
  {
    key: "sprint_ability" as QuestionKey,
    question: "How would you rate your sprint/acceleration ability?",
    options: [
      { band: "A" as AnswerBand, label: "Rarely sprint" },
      { band: "B" as AnswerBand, label: "Occasionally (casual sport)" },
      { band: "C" as AnswerBand, label: "Regularly (recreational sport)" },
      { band: "D" as AnswerBand, label: "Regularly (competitive sport)" },
    ],
    stats: [StatType.SPD, StatType.PWR],
  },
  {
    key: "flexibility" as QuestionKey,
    question: "How flexible are you / how often do you stretch?",
    options: [
      { band: "A" as AnswerBand, label: "Can't touch toes, never stretch" },
      { band: "B" as AnswerBand, label: "Close to toes, rarely stretch" },
      { band: "C" as AnswerBand, label: "Touch toes, stretch occasionally" },
      {
        band: "D" as AnswerBand,
        label: "Touch toes easily, stretch regularly",
      },
    ],
    stats: [StatType.FLX],
  },
  {
    key: "training_days" as QuestionKey,
    question: "How many days per week do you currently train?",
    options: [
      { band: "A" as AnswerBand, label: "0 days" },
      { band: "B" as AnswerBand, label: "1–2 days" },
      { band: "C" as AnswerBand, label: "3–4 days" },
      { band: "D" as AnswerBand, label: "5+ days" },
    ],
    stats: [StatType.DSC],
  },
  {
    key: "recovery_speed" as QuestionKey,
    question: "How quickly do you recover after a hard session?",
    options: [
      { band: "A" as AnswerBand, label: "Sore 3+ days, need long rest" },
      { band: "B" as AnswerBand, label: "Sore 1–2 days" },
      { band: "C" as AnswerBand, label: "Mild soreness, ready next day" },
      { band: "D" as AnswerBand, label: "Rarely sore, ready next day" },
    ],
    stats: [StatType.VIT],
  },
  {
    key: "coordination" as QuestionKey,
    question: "Rate your coordination/agility in sport contexts?",
    options: [
      { band: "A" as AnswerBand, label: "Rarely play sports requiring it" },
      { band: "B" as AnswerBand, label: "Casual, below average" },
      { band: "C" as AnswerBand, label: "Casual, average" },
      { band: "D" as AnswerBand, label: "Regular competitive play, strong" },
    ],
    stats: [StatType.AGI],
  },
];

// Maps a band answer to a starting stat value (10–40 range per PRD)
export const BAND_VALUES: Record<AnswerBand, number> = {
  A: 12,
  B: 22,
  C: 30,
  D: 38,
};

// Special overrides from the PRD mapping table
export const BAND_VALUES_BY_KEY: Partial<
  Record<QuestionKey, Record<AnswerBand, number>>
> = {
  max_pushups: { A: 12, B: 20, C: 30, D: 38 },
  max_pullups: { A: 12, B: 20, C: 30, D: 38 },
  flexibility: { A: 12, B: 20, C: 28, D: 36 },
};

export function getBandValue(key: QuestionKey, band: AnswerBand): number {
  return BAND_VALUES_BY_KEY[key]?.[band] ?? BAND_VALUES[band];
}
