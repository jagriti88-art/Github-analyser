import { useEffect, useState } from "react";
import { Trophy, Loader2 } from "lucide-react";

import RepoSummaryList from "../components/RepoSummaryList";
import { ErrorBanner } from "../components/Feedback";
import { fetchLeaderboard, fetchStats } from "../lib/api";

export default function Leaderboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchLeaderboard(25), fetchStats()])
      .then(([leaderboard, aggregate]) => {
        if (cancelled) return;
        setItems(leaderboard);
        setStats(aggregate);
      })
      .catch((caught) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight">
          <Trophy className="size-7 text-yellow-400" aria-hidden="true" />
          Leaderboard
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-300">
          The highest-scoring repositories analysed on this instance, ranked by rubric score.
        </p>
      </header>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {stats?.totalAnalyses ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["repositories", stats.uniqueRepos],
            ["analyses", stats.totalAnalyses],
            ["average", stats.averageScore],
            ["best", stats.bestScore],
          ].map(([label, value]) => (
            <div key={label} className="card px-4 py-3 text-center">
              <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
              <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <section className="card p-5">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading leaderboard
          </p>
        ) : (
          <RepoSummaryList
            items={items}
            ranked
            emptyMessage="No repositories analysed yet. Grade one to open the board."
          />
        )}
      </section>
    </div>
  );
}
