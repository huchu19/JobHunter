import type { InlineToken, MarkdownBlock } from "@/app/lib/markdown";

/**
 * Renders the block tree produced by `app/lib/markdown.ts`. Server-component
 * friendly (no client hooks). Internal /guides links stay same-tab; external
 * links open in a new tab.
 */

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((t, i) => {
        switch (t.type) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-foreground">
                {t.text}
              </strong>
            );
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.9em] text-brand-strong"
              >
                {t.text}
              </code>
            );
          case "link": {
            const external = t.href?.startsWith("http");
            return (
              <a
                key={i}
                href={t.href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="font-medium text-brand-strong underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
              >
                {t.text}
              </a>
            );
          }
          default:
            return <span key={i}>{t.text}</span>;
        }
      })}
    </>
  );
}

export default function MarkdownContent({
  blocks,
}: {
  blocks: MarkdownBlock[];
}) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return (
                <h1
                  key={i}
                  className="display text-3xl text-foreground"
                >
                  <Inline tokens={block.inline} />
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={i}
                  className="pt-4 text-xl font-bold tracking-tight text-foreground"
                >
                  <Inline tokens={block.inline} />
                </h2>
              );
            }
            return (
              <h3 key={i} className="pt-2 text-base font-semibold text-foreground">
                <Inline tokens={block.inline} />
              </h3>
            );
          }
          case "list":
            return block.ordered ? (
              <ol
                key={i}
                className="list-decimal space-y-1.5 pl-6 text-[15px] leading-relaxed text-muted marker:font-semibold marker:text-brand-strong"
              >
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline tokens={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul
                key={i}
                className="list-disc space-y-1.5 pl-6 text-[15px] leading-relaxed text-muted marker:text-brand"
              >
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline tokens={item} />
                  </li>
                ))}
              </ul>
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-[15px] leading-relaxed text-brand-strong"
              >
                <Inline tokens={block.inline} />
              </blockquote>
            );
          default:
            return (
              <p key={i} className="text-[15px] leading-relaxed text-muted">
                <Inline tokens={block.inline} />
              </p>
            );
        }
      })}
    </div>
  );
}
