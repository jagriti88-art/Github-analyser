import { useCallback, useState } from "react";
import { GitGraph } from "lucide-react";

import RepoInput from "../components/RepoInput";
import ScoreCard from "../components/ScoreCard";
import CategoryBreakdown from "../components/CategoryBreakdown";
import ReviewPanel, { Roadmap } from "../components/ReviewPanel";
import { ErrorBanner, LoadingState, EmptyState } from "../components/Feedback";
import { analyzeRepository } from "../lib/api";

export default function Home() {
  const [result, setResult] = useState(null);
  const [lastQuery, setLastQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (repoUrl, options) => {
    setLoading(true);
    setError(null);
    setLastQuery(repoUrl);

    try {
      setResult(await analyzeRepository(repoUrl, options));
    } catch (caught) {
      setError(caught.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <header className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2.5 text-4xl font-bold tracking-tight">
          <GitGraph className="size-8 text-brand-400" aria-hidden="true" />
          GitGrade
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-ink-300">
          Score any public GitHub repository against a transparent rubric, then get an AI review that
          says what to fix first.
        </p>
      </header>

      <div className="space-y-6">
        <RepoInput
          onAnalyze={run}
          onRefresh={() => lastQuery && run(lastQuery, { refresh: true })}
          canRefresh={Boolean(result)}
          loading={loading}
        />

        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        {loading ? <LoadingState /> : null}

        {!loading && result ? (
          <>
            <ScoreCard
              metrics={result.metrics}
              rubric={result.rubric}
              analyzedAt={result.analyzedAt}
              cached={result.cached}
            />
            <ReviewPanel review={result.review} />
            <Roadmap roadmap={result.review.roadmap} />
            <CategoryBreakdown rubric={result.rubric} />
          </>
        ) : null}

        {!loading && !result && !error ? <EmptyState /> : null}
      </div>

      <footer className="mt-12 text-center text-xs text-ink-500">
        Scores are heuristics, not judgements. Data comes from the public GitHub REST API.
      </footer>
    </div>
  );
}
