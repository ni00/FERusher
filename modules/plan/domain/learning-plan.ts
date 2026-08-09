import type { TrackId } from "@/modules/catalog/domain/question";

export const planDurations = [7, 14, 30] as const;
export type PlanDuration = (typeof planDurations)[number];

export interface LearningPlan {
  id: "active";
  durationDays: PlanDuration;
  dailyTarget: number;
  trackIds: TrackId[];
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDay {
  index: number;
  date: string;
  trackId: TrackId;
}

export function toLocalDateKey(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

export function createLearningPlan({
  durationDays,
  dailyTarget,
  trackIds,
  startDate = toLocalDateKey(),
}: {
  durationDays: PlanDuration;
  dailyTarget: number;
  trackIds: TrackId[];
  startDate?: string;
}): LearningPlan {
  if (!planDurations.includes(durationDays)) {
    throw new Error("学习周期只支持 7、14 或 30 天");
  }
  if (!Number.isInteger(dailyTarget) || dailyTarget < 1 || dailyTarget > 100) {
    throw new Error("每日题量必须在 1–100 之间");
  }
  if (!trackIds.length) throw new Error("至少选择一个学习方向");

  const timestamp = new Date().toISOString();
  return {
    id: "active",
    durationDays,
    dailyTarget,
    trackIds: [...new Set(trackIds)],
    startDate,
    endDate: addLocalDays(startDate, durationDays - 1),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getPlanDays(plan: LearningPlan): PlanDay[] {
  return Array.from({ length: plan.durationDays }, (_, index) => ({
    index: index + 1,
    date: addLocalDays(plan.startDate, index),
    trackId: plan.trackIds[index % plan.trackIds.length] as TrackId,
  }));
}
