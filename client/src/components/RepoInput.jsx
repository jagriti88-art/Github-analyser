import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, RefreshCw } from "lucide-react";

const EXAMPLES = ["facebook/react", "sindresorhus/slugify", "vercel/next.js"];

// Mirrors the server's parser so obvious mistakes never cost a round trip.
const LOOKS_LIKE_REPO =
  /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?[\w.-]+\/[\w.-]+(?:\.git)?(?:[/?#].*)?$/i;

export default function RepoInput({ onAnalyze, onRefresh, loading, canRefresh }) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = url.trim();
  const invalid = touched && trimmed.length > 0 && !LOOKS_LIKE_REPO.test(trimmed);

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (!trimmed || !LOOKS_LIKE_REPO.test(trimmed) || loading) return;
    onAnalyze(trimmed);
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="card p-5 sm:p-6"
    >
      <label htmlFor="repo-url" className="mb-2 block text-sm font-medium text-ink-300">
        GitHub repository
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
            aria-hidden="true"
          />
          <input
            id="repo-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => setTouched(true)}
            disabled={loading}
            autoComplete="off"
            spellCheck="false"
            aria-invalid={invalid}
            aria-describedby={invalid ? "repo-url-error" : undefined}
            placeholder="https://github.com/owner/repo"
            className={`w-full rounded-xl border bg-ink-950/60 py-3 pl-10 pr-3 text-sm outline-none transition
              placeholder:text-ink-500 disabled:opacity-60
              ${invalid ? "border-bad/60 focus:border-bad" : "border-white/10 focus:border-brand-500"}
              focus:ring-2 focus:ring-brand-500/30`}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !trimmed}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold
            text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/50
            disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Analysing" : "Analyse"}
        </button>

        {canRefresh && !loading ? (
          <button
            type="button"
            onClick={onRefresh}
            title="Re-run the analysis, bypassing the cache"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3
              text-sm text-ink-300 transition hover:border-white/25 hover:text-ink-100"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            <span className="sm:hidden">Refresh</span>
          </button>
        ) : null}
      </div>

      {invalid ? (
        <p id="repo-url-error" role="alert" className="mt-2 text-xs text-bad">
          That does not look like a GitHub repository. Try owner/repo or a full github.com URL.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span>Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => {
                setUrl(example);
                onAnalyze(example);
              }}
              className="chip transition hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </motion.form>
  );
}
