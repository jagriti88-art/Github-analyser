import { motion } from "framer-motion";
import { TriangleAlert, FolderGit2 } from "lucide-react";

export function ErrorBanner({ message, onDismiss }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      <button type="button" onClick={onDismiss} className="text-xs underline underline-offset-2 hover:opacity-80">
        dismiss
      </button>
    </motion.div>
  );
}

/** Skeleton that mirrors the real result layout, so the page does not jump when data lands. */
export function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Analysing repository</span>

      <div className="card flex animate-pulse flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
        <div className="size-36 shrink-0 rounded-full border-8 border-white/10" />
        <div className="w-full space-y-3">
          <div className="h-6 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-4 rounded bg-white/5" />
            ))}
          </div>
        </div>
      </div>

      <div className="card animate-pulse space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="h-2 flex-1 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="card grid place-items-center gap-3 p-12 text-center">
      <FolderGit2 className="size-10 text-ink-700" aria-hidden="true" />
      <p className="text-sm text-ink-300">Paste a repository above to get a graded report.</p>
      <p className="max-w-md text-xs text-ink-500">
        GitGrade reads the repository tree, commit history, README and metadata, scores it against a fixed
        rubric, then asks an LLM to prioritise what to fix first.
      </p>
    </div>
  );
}
