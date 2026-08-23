import { useState } from "react";
import { Copy, Check, Download, FileJson, FileText, Link2 } from "lucide-react";

import { badgeUrl } from "../lib/api";
import { toMarkdown, downloadFile } from "../lib/report";

function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null);

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1800);
    } catch {
      // Clipboard is unavailable over plain http on some browsers; the field stays selectable.
    }
  };

  return [copiedKey, copy];
}

function ActionButton({ onClick, icon: Icon, children, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs
        text-ink-300 transition hover:border-white/25 hover:text-ink-100"
    >
      {active ? <Check className="size-3.5 text-good" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default function ShareTools({ analysis }) {
  const [copiedKey, copy] = useCopy();
  const slug = analysis.metrics.repo.slug;

  const badge = badgeUrl(slug);
  const markdownBadge = `[![GitGrade](${badge})](${window.location.origin}/r/${slug})`;
  const permalink = `${window.location.origin}/r/${slug}`;

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">Share</h2>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <img src={badge} alt={`GitGrade score badge for ${slug}`} className="h-5" />
        <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-ink-950/60 px-3 py-1.5 font-mono text-xs text-ink-300">
          {markdownBadge}
        </code>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={Copy}
          active={copiedKey === "badge"}
          onClick={() => copy("badge", markdownBadge)}
        >
          {copiedKey === "badge" ? "Copied" : "Copy badge markdown"}
        </ActionButton>

        <ActionButton icon={Link2} active={copiedKey === "link"} onClick={() => copy("link", permalink)}>
          {copiedKey === "link" ? "Copied" : "Copy permalink"}
        </ActionButton>

        <ActionButton
          icon={FileText}
          onClick={() => downloadFile(`gitgrade-${slug.replace("/", "-")}.md`, toMarkdown(analysis), "text/markdown")}
        >
          Download report
        </ActionButton>

        <ActionButton
          icon={FileJson}
          onClick={() =>
            downloadFile(
              `gitgrade-${slug.replace("/", "-")}.json`,
              JSON.stringify(analysis, null, 2),
              "application/json"
            )
          }
        >
          Download JSON
        </ActionButton>

        <ActionButton icon={Download} active={copiedKey === "md"} onClick={() => copy("md", toMarkdown(analysis))}>
          {copiedKey === "md" ? "Copied" : "Copy markdown"}
        </ActionButton>
      </div>
    </section>
  );
}
