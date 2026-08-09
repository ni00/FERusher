import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { MockInterview } from "@/modules/interview/ui/mock-interview";

export const metadata: Metadata = { title: "模拟面试" };

export default function InterviewPage() {
  return (
    <>
      <PageHeader title="模拟面试" />
      <MockInterview />
    </>
  );
}
