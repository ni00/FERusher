import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { isTrackId } from "@/modules/catalog/domain/question";
import { PracticeWorkspace } from "@/modules/practice/ui/practice-workspace";

export const metadata: Metadata = { title: "看题练习" };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    track?: string;
    question?: string;
    review?: string;
    size?: string;
  }>;
}) {
  const parameters = await searchParams;
  const initialTrack =
    parameters.track && isTrackId(parameters.track) ? parameters.track : "all";

  return (
    <>
      <PageHeader title="看题练习" />
      <PracticeWorkspace
        initialTrack={initialTrack}
        initialQuestionId={parameters.question}
        initialReviewOnly={parameters.review === "1"}
        initialSize={
          parameters.size && ["10", "20", "30", "60"].includes(parameters.size)
            ? (Number(parameters.size) as 10 | 20 | 30 | 60)
            : 10
        }
      />
    </>
  );
}
