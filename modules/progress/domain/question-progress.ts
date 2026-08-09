export const progressStatuses = ["unseen", "learning", "mastered"] as const;

export type ProgressStatus = (typeof progressStatuses)[number];
export const reviewRatings = ["again", "learning", "mastered"] as const;
export type ReviewRating = (typeof reviewRatings)[number];

export interface QuestionProgress {
  questionId: string;
  status: ProgressStatus;
  favorite: boolean;
  attempts: number;
  intervalDays: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  updatedAt: string;
}

export function createQuestionProgress(questionId: string): QuestionProgress {
  return {
    questionId,
    status: "unseen",
    favorite: false,
    attempts: 0,
    intervalDays: 0,
    updatedAt: new Date().toISOString(),
  };
}

function addDays(value: Date, days: number): string {
  return new Date(value.getTime() + days * 86_400_000).toISOString();
}

export function normalizeQuestionProgress(
  value: Partial<QuestionProgress> & Pick<QuestionProgress, "questionId">
): QuestionProgress {
  const status = progressStatuses.includes(value.status as ProgressStatus)
    ? (value.status as ProgressStatus)
    : "unseen";
  const updatedAt = value.updatedAt ?? new Date().toISOString();
  const intervalDays = Math.max(
    0,
    Math.round(
      value.intervalDays ??
        (status === "mastered" ? 7 : status === "learning" ? 1 : 0)
    )
  );

  return {
    questionId: value.questionId,
    status,
    favorite: value.favorite ?? false,
    attempts: Math.max(0, Math.round(value.attempts ?? 0)),
    intervalDays,
    ...(value.lastReviewedAt ? { lastReviewedAt: value.lastReviewedAt } : {}),
    ...(status !== "unseen"
      ? { nextReviewAt: value.nextReviewAt ?? updatedAt }
      : {}),
    updatedAt,
  };
}

export function applyReview(
  value: QuestionProgress,
  rating: ReviewRating,
  reviewedAt = new Date()
): QuestionProgress {
  const current = normalizeQuestionProgress(value);
  const intervalDays =
    rating === "again"
      ? 1
      : rating === "learning"
        ? Math.min(
            14,
            current.intervalDays <= 1
              ? 3
              : Math.ceil(current.intervalDays * 1.7)
          )
        : Math.min(
            180,
            current.status === "mastered"
              ? Math.ceil(current.intervalDays * 2.2)
              : 7
          );
  const timestamp = reviewedAt.toISOString();

  return {
    ...current,
    status: rating === "mastered" ? "mastered" : "learning",
    attempts: current.attempts + 1,
    intervalDays,
    lastReviewedAt: timestamp,
    nextReviewAt: addDays(reviewedAt, intervalDays),
    updatedAt: timestamp,
  };
}

export function setProgressStatus(
  value: QuestionProgress,
  status: ProgressStatus,
  changedAt = new Date()
): QuestionProgress {
  const current = normalizeQuestionProgress(value);
  const timestamp = changedAt.toISOString();
  if (status === "unseen") {
    const {
      lastReviewedAt: _lastReviewedAt,
      nextReviewAt: _nextReviewAt,
      ...rest
    } = current;
    return { ...rest, status, intervalDays: 0, updatedAt: timestamp };
  }

  const intervalDays = Math.max(
    current.intervalDays,
    status === "mastered" ? 7 : 1
  );
  return {
    ...current,
    status,
    intervalDays,
    nextReviewAt: current.nextReviewAt ?? addDays(changedAt, intervalDays),
    updatedAt: timestamp,
  };
}

export function isReviewDue(
  value: QuestionProgress | undefined,
  now = Date.now()
): boolean {
  if (!value || value.attempts === 0 || value.status === "unseen") return false;
  const dueAt = Date.parse(value.nextReviewAt ?? value.updatedAt);
  return Number.isFinite(dueAt) && dueAt <= now;
}
