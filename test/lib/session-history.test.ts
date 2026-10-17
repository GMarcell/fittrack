import { describe, it, expect } from "vitest";
import {
  missedPlanDays,
  plannedTrainingDays,
  shiftWeekKey,
  trainingStreak,
  weekKeyInTimezone,
  weeklyAdherence,
  type SessionLike,
  type WeekPlan,
} from "@/lib/session";

const day = (dayName: string, rest = false): WeekPlan["weeklySchedule"][number] => ({
  day: dayName,
  sessionType: rest ? "Rest" : "Full body",
  warmUp: [],
  mainWorkout: rest
    ? []
    : [{ exercise: "Squat", sets: 3, reps: "8" }],
  cooldown: [],
});

const plan: WeekPlan = {
  weeklySchedule: [
    day("Monday"),
    day("Tuesday", true),
    day("Wednesday"),
    day("Thursday", true),
    day("Friday"),
    day("Saturday", true),
    day("Sunday", true),
  ],
};

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

const session = (date: string, opts: Partial<SessionLike> = {}): SessionLike => ({
  date: at(date),
  planDay: "Monday",
  completedAt: at(date),
  ...opts,
});

describe("weekKeyInTimezone", () => {
  it("uses UTC when no timezone is given", () => {
    expect(weekKeyInTimezone(new Date("2026-10-18T12:00:00Z"))).toBe("2026-10-12");
  });

  it("puts a late Sunday UTC session into Monday's week in Jakarta", () => {
    // 2026-10-18 20:00 UTC is Monday 03:00 in Jakarta (UTC+7).
    expect(
      weekKeyInTimezone(new Date("2026-10-18T20:00:00Z"), "Asia/Jakarta"),
    ).toBe("2026-10-19");
  });
});

describe("shiftWeekKey", () => {
  it("walks backwards and forwards across month boundaries", () => {
    expect(shiftWeekKey("2026-10-05", -1)).toBe("2026-09-28");
    expect(shiftWeekKey("2026-10-26", 1)).toBe("2026-11-02");
  });
});

describe("plannedTrainingDays", () => {
  it("counts only days that ask for a session", () => {
    expect(plannedTrainingDays(plan).map((d) => d.day)).toEqual([
      "Monday",
      "Wednesday",
      "Friday",
    ]);
  });

  it("returns nothing without a plan", () => {
    expect(plannedTrainingDays(null)).toEqual([]);
  });
});

describe("missedPlanDays", () => {
  // Plan has sessions Monday, Wednesday and Friday.
  const thursday = at("2026-10-15");

  it("reports earlier planned days that were never started", () => {
    expect(missedPlanDays(plan, [], thursday).map((d) => d.day)).toEqual([
      "Wednesday",
      "Monday",
    ]);
  });

  it("ignores days that already have a session, even an unfinished one", () => {
    const sessions = [
      session("2026-10-12"),
      session("2026-10-14", { planDay: "Wednesday", completedAt: null }),
    ];
    expect(missedPlanDays(plan, sessions, thursday)).toEqual([]);
  });

  it("does not count today or later days as missed", () => {
    const friday = at("2026-10-16");
    expect(missedPlanDays(plan, [session("2026-10-12")], friday).map((d) => d.day)).toEqual([
      "Wednesday",
    ]);
  });

  it("ignores rest days and empty plans", () => {
    expect(missedPlanDays(null, [], thursday)).toEqual([]);
  });
});

describe("weeklyAdherence", () => {
  const now = at("2026-10-14"); // Wednesday of the week starting 2026-10-12

  it("counts completed plan sessions in the current week", () => {
    const result = weeklyAdherence(
      [
        session("2026-10-12"),
        session("2026-10-14", { planDay: "Wednesday" }),
        session("2026-10-13", { planDay: null }), // ad-hoc, not adherence
        session("2026-10-15", { completedAt: null }), // started, not finished
        session("2026-10-05"), // previous week
      ],
      plan,
      now,
    );

    expect(result).toEqual({ weekStart: "2026-10-12", planned: 3, completed: 2, percent: 67 });
  });

  it("never reports over 100% when extra plan days are done", () => {
    const result = weeklyAdherence(
      [
        session("2026-10-12"),
        session("2026-10-13"),
        session("2026-10-14"),
        session("2026-10-15"),
      ],
      plan,
      now,
    );

    expect(result.completed).toBe(4);
    expect(result.percent).toBe(100);
  });

  it("is zero-percent when there is no plan", () => {
    expect(weeklyAdherence([session("2026-10-12")], null, now).percent).toBe(0);
  });
});

describe("trainingStreak", () => {
  const now = at("2026-10-14");

  it("counts consecutive weeks with a completed workout", () => {
    expect(
      trainingStreak(
        [
          session("2026-10-12"),
          session("2026-10-05"),
          session("2026-09-30"),
          session("2026-09-14"),
        ],
        now,
      ),
    ).toBe(3);
  });

  it("does not break the streak early in a week with no session yet", () => {
    expect(
      trainingStreak([session("2026-10-05"), session("2026-09-28")], now),
    ).toBe(2);
  });

  it("ignores unfinished sessions", () => {
    expect(
      trainingStreak([session("2026-10-12", { completedAt: null })], now),
    ).toBe(0);
  });

  it("is zero with no workouts", () => {
    expect(trainingStreak([], now)).toBe(0);
  });
});
