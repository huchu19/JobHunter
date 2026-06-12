import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GUIDES, getGuide, loadGuideContent } from "@/app/lib/guides";
import { parseMarkdown } from "@/app/lib/markdown";
import MarkdownContent from "@/app/components/guides/MarkdownContent";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const content = guide ? loadGuideContent(slug) : null;
  if (!guide || !content) notFound();

  const blocks = parseMarkdown(content);

  // "More guides" footer: everything except the current one.
  const others = GUIDES.filter((g) => g.slug !== slug);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-8 py-5">
        <Link
          href="/guides"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={15} /> All guides
        </Link>
      </header>

      <div className="flex-1 overflow-auto">
        <article className="mx-auto max-w-3xl p-8">
          <MarkdownContent blocks={blocks} />

          <div className="mt-10 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground">
              More guides
            </h2>
            <ul className="mt-3 space-y-2">
              {others.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
                  >
                    <ArrowRight size={14} /> {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}
