"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyReview,
  createQuestionProgress,
  setProgressStatus,
  type ProgressStatus,
  type QuestionProgress,
  type ReviewRating,
} from "../domain/question-progress";
import {
  listQuestionProgress,
  saveQuestionReview,
  saveQuestionProgress,
} from "../infrastructure/question-progress-repository";
import { createReviewEvent } from "../domain/review-event";

export function useQuestionProgress() {
  const [records, setRecords] = useState<Map<string, QuestionProgress>>(
    () => new Map()
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    listQuestionProgress()
      .then(items => {
        if (!active) return;
        setRecords(new Map(items.map(item => [item.questionId, item])));
        setIsReady(true);
      })
      .catch(error => {
        console.error("Failed to load local progress", error);
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(
    (
      questionId: string,
      change: (current: QuestionProgress) => QuestionProgress
    ) => {
      setRecords(currentRecords => {
        const nextRecords = new Map(currentRecords);
        const next = change(
          currentRecords.get(questionId) ?? createQuestionProgress(questionId)
        );
        nextRecords.set(questionId, next);
        void saveQuestionProgress(next).catch(error => {
          console.error("Failed to save local progress", error);
        });
        return nextRecords;
      });
    },
    []
  );

  const toggleFavorite = useCallback(
    (questionId: string) => {
      update(questionId, current => ({
        ...current,
        favorite: !current.favorite,
        updatedAt: new Date().toISOString(),
      }));
    },
    [update]
  );

  const setStatus = useCallback(
    (questionId: string, status: ProgressStatus) => {
      update(questionId, current => setProgressStatus(current, status));
    },
    [update]
  );

  const recordReview = useCallback(
    (questionId: string, rating: ReviewRating) => {
      const reviewedAt = new Date();
      setRecords(currentRecords => {
        const nextRecords = new Map(currentRecords);
        const next = applyReview(
          currentRecords.get(questionId) ?? createQuestionProgress(questionId),
          rating,
          reviewedAt
        );
        const event = createReviewEvent(questionId, rating, reviewedAt);
        nextRecords.set(questionId, next);
        void saveQuestionReview(next, event).catch(error => {
          console.error("Failed to save local review", error);
        });
        return nextRecords;
      });
    },
    []
  );

  const favoriteIds = useMemo(
    () =>
      new Set(
        Array.from(records.values())
          .filter(item => item.favorite)
          .map(item => item.questionId)
      ),
    [records]
  );

  return {
    records,
    favoriteIds,
    isReady,
    recordReview,
    toggleFavorite,
    setStatus,
  };
}
