import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Compass aria-hidden="true" />
      </span>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        404 · 路径不存在
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        这里还没有训练内容
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        返回首页继续学习，或从题库选择新的方向。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonStyles()}>
          返回首页
        </Link>
        <Link
          href="/questions"
          className={buttonStyles({ variant: "secondary" })}
        >
          浏览题库
        </Link>
      </div>
    </main>
  );
}
