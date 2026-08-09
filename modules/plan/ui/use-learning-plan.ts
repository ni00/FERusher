"use client";

import { useCallback, useEffect, useState } from "react";
import type { LearningPlan } from "../domain/learning-plan";
import {
  deleteLearningPlan,
  getLearningPlan,
  saveLearningPlan,
} from "../infrastructure/learning-plan-repository";

export function useLearningPlan() {
  const [plan, setPlan] = useState<LearningPlan>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    getLearningPlan()
      .then(value => {
        if (active) setPlan(value);
      })
      .catch(error => console.error("Failed to load learning plan", error))
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (value: LearningPlan) => {
    await saveLearningPlan(value);
    setPlan(value);
  }, []);

  const remove = useCallback(async () => {
    await deleteLearningPlan();
    setPlan(undefined);
  }, []);

  return { plan, isReady, persist, remove };
}
