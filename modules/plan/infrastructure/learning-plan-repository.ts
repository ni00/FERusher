import {
  deleteRecord,
  getRecord,
  localStores,
  putRecord,
} from "@/modules/local-data/infrastructure/database";
import type { LearningPlan } from "../domain/learning-plan";

export function getLearningPlan(): Promise<LearningPlan | undefined> {
  return getRecord<LearningPlan>(localStores.learningPlans, "active");
}

export function saveLearningPlan(plan: LearningPlan): Promise<void> {
  return putRecord(localStores.learningPlans, plan);
}

export function deleteLearningPlan(): Promise<void> {
  return deleteRecord(localStores.learningPlans, "active");
}
