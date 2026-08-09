import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { QuestionBank } from "@/modules/catalog/ui/question-bank";

export const metadata: Metadata = { title: "题库" };

export default function QuestionsPage() {
  return (
    <>
      <PageHeader title="题库" />
      <Suspense
        fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}
      >
        <QuestionBank />
      </Suspense>
    </>
  );
}
