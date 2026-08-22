"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BookOpenText,
  CheckCircle2,
  Repeat2,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { trackDefinitions } from "@/modules/catalog/domain/question";
import {
  loadContentManifest,
  type ContentManifest,
} from "@/modules/catalog/infrastructure/content-pack-source";
import { useQuestionProgress } from "@/modules/progress/ui/use-question-progress";
import { isReviewDue } from "@/modules/progress/domain/question-progress";

export function DashboardOverview() {
  const { records } = useQuestionProgress();
  const [manifest, setManifest] = useState<ContentManifest>();

  useEffect(() => {
    const controller = new AbortController();
    loadContentManifest(controller.signal)
      .then(setManifest)
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error("Failed to load content manifest", error);
        }
      });
    return () => controller.abort();
  }, []);
  const values = Array.from(records.values());
  const attempted = values.filter(item => item.attempts > 0).length;
  const mastered = values.filter(item => item.status === "mastered").length;
  const favorites = values.filter(item => item.favorite).length;
  const due = values.filter(item => isReviewDue(item)).length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <div className="rounded-xl border border-border bg-surface p-5 sm:p-7">
          <h1 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            从一道题开始
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            从精选题集开始；需要时再搜索完整真题库。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/questions" className={buttonStyles()}>
              <BookOpenText aria-hidden="true" />
              浏览题库
            </Link>
            <Link
              href="/practice"
              className={buttonStyles({ variant: "secondary" })}
            >
              随机看一组
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">学习概览</p>
            </div>
            <Target className="size-5 text-primary" aria-hidden="true" />
          </div>
          <dl className="mt-5 grid grid-cols-3 divide-x divide-border">
            <div className="pr-3">
              <dt className="text-xs text-muted-foreground">已练习</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {attempted}
              </dd>
            </div>
            <div className="px-3">
              <dt className="text-xs text-muted-foreground">已掌握</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {mastered}
              </dd>
            </div>
            <div className="pl-3">
              <dt className="text-xs text-muted-foreground">收藏</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {favorites}
              </dd>
            </div>
          </dl>
          <Link
            href="/profile"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            查看我的学习 <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="tracks-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2
            id="tracks-title"
            className="text-lg font-semibold tracking-tight"
          >
            九个主方向
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trackDefinitions.map((track, index) => (
            <TrackCard
              key={track.id}
              track={track}
              index={index}
              release={manifest?.tracks.find(item => item.id === track.id)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Link
          href="/practice?review=1"
          className="flex min-w-0 items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-10 place-items-center rounded-md bg-primary-soft text-primary">
            <Repeat2 className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">复习到期题目</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {due ? `当前有 ${due} 道需要复习` : "当前没有到期题目"}
            </span>
          </span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/interview"
          className="flex min-w-0 items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-10 place-items-center rounded-md bg-primary-soft text-primary">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              做一轮文字模拟面试
            </span>
          </span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/questions?favorites=1"
          className="flex min-w-0 items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
            <Bookmark className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              复习收藏与薄弱题
            </span>
          </span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
      </section>
    </div>
  );
}

function TrackCard({
  track,
  index,
  release,
}: {
  track: (typeof trackDefinitions)[number];
  index: number;
  release?: ContentManifest["tracks"][number];
}) {
  return (
    <Link
      href={`/questions?track=${track.id}`}
      className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-7 place-items-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
        <ArrowRight
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold">{track.label}</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {track.description}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="truncate">{track.topics.join(" · ")}</span>
        {release ? (
          <span
            className={`shrink-0 font-medium tabular-nums ${release.count ? "text-success" : "text-muted-foreground"}`}
          >
            {release.count
              ? `${release.coreCount.toLocaleString("zh-CN")} 精选 · ${release.count.toLocaleString("zh-CN")} 全部`
              : "待收录"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
