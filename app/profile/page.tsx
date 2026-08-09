import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonStyles } from "@/components/ui/button";
import { LearningPlanWorkspace } from "@/modules/plan/ui/learning-plan-workspace";
import { AbilityProfile } from "@/modules/profile/ui/ability-profile";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "我的学习" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view = (await searchParams).view === "plan" ? "plan" : "progress";

  return (
    <>
      <PageHeader
        title="我的学习"
        actions={
          <Link
            href="/settings"
            className={buttonStyles({ variant: "secondary" })}
          >
            <Settings aria-hidden="true" /> 数据管理
          </Link>
        }
      />
      <nav
        className="mb-5 flex gap-1 border-b border-border"
        aria-label="我的学习"
      >
        <Link
          href="/profile"
          aria-current={view === "progress" ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === "progress"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          进度画像
        </Link>
        <Link
          href="/profile?view=plan"
          aria-current={view === "plan" ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === "plan"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          学习计划
        </Link>
      </nav>
      {view === "plan" ? <LearningPlanWorkspace /> : <AbilityProfile />}
    </>
  );
}
