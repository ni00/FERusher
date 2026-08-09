"use client";

import {
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyStatus = "idle" | "copied" | "error";

const copyStatusContent = {
  idle: { label: "复制", icon: Copy },
  copied: { label: "已复制", icon: Check },
  error: { label: "复制失败", icon: TriangleAlert },
} satisfies Record<CopyStatus, { label: string; icon: typeof Copy }>;

export function CodeBlock({ children }: { children: ReactNode }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { label, icon: StatusIcon } = copyStatusContent[copyStatus];

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    []
  );

  const handleCopy = async () => {
    const code = getNodeText(children).replace(/\r?\n$/, "");

    try {
      await copyText(code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyStatus("idle"), 1800);
  };

  return (
    <div className="relative my-4 overflow-hidden rounded-lg border border-border bg-[hsl(var(--code-background))] text-[hsl(var(--code-foreground))]">
      <Button
        aria-label={label}
        title={label}
        variant="secondary"
        size="sm"
        className={cn(
          "absolute right-2 top-2 z-10 border-white/20 bg-[hsl(var(--code-background))] px-2.5 text-[hsl(var(--code-foreground))] hover:bg-white/10 hover:text-white focus-visible:ring-white/70 focus-visible:ring-offset-[hsl(var(--code-background))]",
          copyStatus === "copied" && "border-emerald-400/40 text-emerald-300",
          copyStatus === "error" && "border-red-400/40 text-red-300"
        )}
        onClick={handleCopy}
      >
        <StatusIcon aria-hidden="true" />
        <span aria-live="polite">{label}</span>
      </Button>
      <pre className="overflow-x-auto overscroll-x-contain p-3 pr-24 sm:p-4 sm:pr-24 [&>code]:!block [&>code]:!min-w-max [&>code]:!rounded-none [&>code]:!bg-transparent [&>code]:!p-0 [&>code]:!text-inherit">
        {children}
      </pre>
    </div>
  );
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (typeof node === "bigint") return node.toString();
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Clipboard permissions can be denied even when the API exists.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
  }

  if (!copied) throw new Error("Unable to copy code");
}
