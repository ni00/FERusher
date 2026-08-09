import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-none break-words text-base leading-7 text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: props => <Heading level={2} {...props} />,
          h2: props => <Heading level={2} {...props} />,
          h3: props => <Heading level={3} {...props} />,
          p: ({ children }) => <p className="my-3 text-pretty">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-border pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const block =
              Boolean(codeClassName?.startsWith("language-")) ||
              String(children).endsWith("\n");
            return block ? (
              <code
                className={cn(
                  "block min-w-max font-mono text-[0.9375rem] leading-6 sm:text-sm",
                  codeClassName
                )}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em]"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top last:border-b-0">
              {children}
            </td>
          ),
          a: ({ children, ...props }) => (
            <a
              className="font-medium text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-5 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function Heading({
  level,
  children,
  ...props
}: ComponentPropsWithoutRef<"h2"> & { level: 2 | 3 }) {
  const className =
    level === 2
      ? "mb-2 mt-6 text-lg font-semibold tracking-tight"
      : "mb-2 mt-5 text-base font-semibold tracking-tight";

  return level === 2 ? (
    <h2 className={className} {...props}>
      {children}
    </h2>
  ) : (
    <h3 className={className} {...props}>
      {children}
    </h3>
  );
}
