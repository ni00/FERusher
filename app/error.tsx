"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" />
      </span>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        页面暂时不可用
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        这次加载没有成功
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        本地数据仍保留在你的浏览器中。可以重新尝试，或先返回首页。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>重新尝试</Button>
        <Link href="/" className={buttonStyles({ variant: "secondary" })}>
          返回首页
        </Link>
      </div>
    </main>
  );
}
