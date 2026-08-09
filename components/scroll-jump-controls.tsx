"use client";

import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollPosition {
  canScrollUp: boolean;
  canScrollDown: boolean;
}

const initialPosition: ScrollPosition = {
  canScrollUp: false,
  canScrollDown: false,
};

export function ScrollJumpControls({
  targetRef,
  className,
}: {
  targetRef?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const [position, setPosition] = useState(initialPosition);

  const updatePosition = useCallback(() => {
    const target = targetRef?.current;
    const scrollTop = target ? target.scrollTop : window.scrollY;
    const viewportHeight = target ? target.clientHeight : window.innerHeight;
    const scrollHeight = target
      ? target.scrollHeight
      : Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
    const maximumScroll = Math.max(0, scrollHeight - viewportHeight);
    const nextPosition = {
      canScrollUp: scrollTop > 4,
      canScrollDown: scrollTop < maximumScroll - 4,
    };

    setPosition(current =>
      current.canScrollUp === nextPosition.canScrollUp &&
      current.canScrollDown === nextPosition.canScrollDown
        ? current
        : nextPosition
    );
  }, [targetRef]);

  useEffect(() => {
    const target = targetRef?.current;
    const scrollTarget: HTMLElement | Window = target ?? window;
    const observedTarget = target ?? document.body;
    let frame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    };

    scheduleUpdate();
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(observedTarget, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(observedTarget);

    return () => {
      cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [targetRef, updatePosition]);

  if (!position.canScrollUp && !position.canScrollDown) return null;

  const scrollTo = (edge: "top" | "bottom") => {
    const target = targetRef?.current;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    const top =
      edge === "top"
        ? 0
        : target
          ? target.scrollHeight
          : document.documentElement.scrollHeight;

    if (target) target.scrollTo({ top, behavior });
    else window.scrollTo({ top, behavior });
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-border bg-surface",
        className
      )}
      role="group"
      aria-label="快速滚动"
    >
      <Button
        size="icon"
        variant="ghost"
        className="rounded-none"
        disabled={!position.canScrollUp}
        aria-label="快速回到顶部"
        title="回到顶部"
        onClick={() => scrollTo("top")}
      >
        <ArrowUpToLine aria-hidden="true" />
      </Button>
      <span className="h-px bg-border" aria-hidden="true" />
      <Button
        size="icon"
        variant="ghost"
        className="rounded-none"
        disabled={!position.canScrollDown}
        aria-label="快速前往底部"
        title="前往底部"
        onClick={() => scrollTo("bottom")}
      >
        <ArrowDownToLine aria-hidden="true" />
      </Button>
    </div>
  );
}
