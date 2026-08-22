import {
  getQuestionTypeLabel,
  getDifficultyLabel,
  getQuestionCompanies,
  isCoreQuestion,
  type Difficulty,
  type Question,
  type QuestionType,
  type TrackId,
} from "../domain/question";

export interface QuestionFilters {
  scope: "core" | "all";
  search: string;
  trackId: TrackId | "all";
  topicId: string;
  difficulty: Difficulty | "all";
  questionType: QuestionType | "all";
  audience: "all" | "campus" | "experienced";
  company: string | "all";
  favoritesOnly: boolean;
}

export function filterQuestions(
  questions: Question[],
  filters: QuestionFilters,
  favoriteIds: ReadonlySet<string>
): Question[] {
  const search = filters.search.trim().toLocaleLowerCase("zh-CN");

  return questions.filter(question => {
    if (filters.scope === "core" && !isCoreQuestion(question)) return false;
    if (filters.trackId !== "all" && question.trackId !== filters.trackId) {
      return false;
    }
    if (filters.topicId !== "all" && question.topicId !== filters.topicId) {
      return false;
    }
    if (
      filters.difficulty !== "all" &&
      question.difficulty !== filters.difficulty
    ) {
      return false;
    }
    if (
      filters.questionType !== "all" &&
      question.questionType !== filters.questionType
    ) {
      return false;
    }
    if (
      filters.audience !== "all" &&
      !question.audiences.includes(filters.audience)
    ) {
      return false;
    }
    if (
      filters.company !== "all" &&
      !getQuestionCompanies(question).includes(filters.company)
    ) {
      return false;
    }
    if (filters.favoritesOnly && !favoriteIds.has(question.id)) return false;
    if (!search) return true;

    return [
      question.prompt,
      question.company,
      question.topicLabel,
      getDifficultyLabel(question.difficulty),
      getQuestionTypeLabel(question.questionType),
      ...question.tags,
      ...question.occurrences.flatMap(occurrence => [
        occurrence.sourceTitle,
        occurrence.originalPrompt,
      ]),
    ].some(value => value?.toLocaleLowerCase("zh-CN").includes(search));
  });
}

export function getCompanyOptions(
  questions: Question[],
  trackId: TrackId | "all",
  limit = 100
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const question of questions) {
    if (trackId !== "all" && question.trackId !== trackId) continue;
    for (const company of getQuestionCompanies(question)) {
      counts.set(company, (counts.get(company) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name, "zh-CN")
    )
    .slice(0, limit);
}

export function getTopicOptions(
  questions: Question[],
  trackId: TrackId | "all"
): Array<{ id: string; label: string }> {
  const topics = new Map<string, string>();

  for (const question of questions) {
    if (trackId === "all" || question.trackId === trackId) {
      topics.set(question.topicId, question.topicLabel);
    }
  }

  return Array.from(topics, ([id, label]) => ({ id, label })).sort((a, b) =>
    a.label.localeCompare(b.label, "zh-CN")
  );
}
