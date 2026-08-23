import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { History, Sparkles } from "lucide-react";

import RepoInput from "../components/RepoInput";
import ScoreCard from "../components/ScoreCard";
import CategoryBreakdown from "../components/CategoryBreakdown";
import ReviewPanel, { Roadmap } from "../components/ReviewPanel";
import RadarChart from "../components/RadarChart";
import ShareTools from "../components/ShareTools";
import RepoSummaryList from "../components/RepoSummaryList";
import { ErrorBanner, LoadingState, EmptyState } from "../components/Feedback";
import { analyzeRepository, fetchStoredAnalysis, fetchHistory, fetchStats } from "../lib/api";

function StatsStrip({ stats }) {
  if (!stats?.totalAnalyses) return null;

  const entries = [
    ["repositories graded", stats.uniqueRepos],
    ["analyses run", stats.totalAnalyses],
    ["average score", stats.averageScore],
    ["best score", stats.bestScore],
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {entries.map(([label, value]) => (
        <div key={label} className="card px-4 py-3 text-center">
          <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
          <dd className="mt-0.5 font-mono text-xl font-semibold text-ink-100 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Home() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  const refreshSidebars = useCallback(() => {
    fetchHistory(6).then(setHistory).catch(() => {});
    fetchStats().then(setStats).catch(() => {});
  }, []);

  useEffect(refreshSidebars, [refreshSidebars]);

  const run = useCallback(
    async (repoUrl, options) => {
      setLoading(true);
      setError(null);

      try {
        const data = await analyzeRepository(repoUrl, options);
        setResult(data);
        // Reflect the analysed repo in the URL so the result is shareable.
        navigate(`/r/${data.metrics.repo.slug}`, { replace: true });
        refreshSidebars();
      } catch (caught) {
        setError(caught.message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [navigate, refreshSidebars]
  );

  // Deep link: /r/owner/repo shows the stored analysis, falling back to a fresh run.
  useEffect(() => {
    if (!owner || !repo) return;
    if (result?.metrics.repo.slug.toLowerCase() === `${owner}/${repo}`.toLowerCase()) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchStoredAnalysis(owner, repo)
      .then((data) => !cancelled && setResult(data))
      .catch((caught) => {
        if (cancelled) return;
        if (caught.status === 404) return analyzeRepository(`${owner}/${repo}`).then((data) => {
          if (!cancelled) setResult(data);
          refreshSidebars();
        });
        throw caught;
      })
      .catch((caught) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the route changes.
  }, [owner, repo]);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Grade any GitHub repository
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          A transparent rubric scores the repository, then an LLM explains what to fix first.
          Every point is traceable to a check you can see.
        </p>
      </header>

      <RepoInput
        onAnalyze={run}
        onRefresh={() => result && run(result.metrics.repo.slug, { refresh: true })}
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
            timeline={result.timeline}
          />

          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-300">
                Category radar
              </h2>
              <RadarChart
                categories={result.rubric.categories}
                series={[
                  {
                    name: result.metrics.repo.slug,
                    color: "#60a5fa",
                    values: result.rubric.categories.map((category) => category.percent),
                  },
                ]}
              />
            </section>

            {result.review ? (
              <ReviewPanel review={result.review} />
            ) : (
              // Comparisons store a rubric without an AI review; offer to fill it in.
              <section className="card flex flex-col items-start justify-center gap-3 p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-300">
                  <Sparkles className="size-4 text-brand-400" aria-hidden="true" />
                  AI review
                </h2>
                <p className="text-sm text-ink-300">
                  This result was stored without an AI review. Re-run the analysis to get a verdict and
                  a prioritised roadmap.
                </p>
                <button
                  type="button"
                  onClick={() => run(result.metrics.repo.slug, { refresh: true })}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                >
                  Run full analysis
                </button>
              </section>
            )}
          </div>

          {result.review ? <Roadmap roadmap={result.review.roadmap} /> : null}
          <CategoryBreakdown rubric={result.rubric} />
          <ShareTools analysis={result} />
        </>
      ) : null}

      {!loading && !result && !error ? (
        <>
          <EmptyState />
          <StatsStrip stats={stats} />
          {history.length ? (
            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-300">
                <History className="size-4" aria-hidden="true" />
                Recently analysed
              </h2>
              <RepoSummaryList items={history} emptyMessage="Nothing yet." />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
