import { useState } from "react";
import { motion } from "framer-motion";
import { Swords, Loader2, Trophy, Minus } from "lucide-react";

import RadarChart from "../components/RadarChart";
import { ErrorBanner } from "../components/Feedback";
import { compareRepositories } from "../lib/api";
import { compactNumber, scoreTone } from "../lib/format";

const LEFT_COLOR = "#60a5fa";
const RIGHT_COLOR = "#f472b6";

function Side({ side, data, color, isWinner }) {
  const tone = scoreTone(data.rubric.score);

  return (
    <div
      className={`card p-5 text-center transition ${isWinner ? "ring-1 ring-inset" : ""}`}
      style={isWinner ? { boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
        <a
          href={data.metrics.repo.url}
          target="_blank"
          rel="noreferrer noopener"
          className="truncate text-sm font-medium hover:text-brand-400"
        >
          {data.metrics.repo.slug}
        </a>
        {isWinner ? <Trophy className="size-4 text-yellow-400" aria-label={`${side} wins`} /> : null}
      </div>

      <p className={`mt-2 font-mono text-4xl font-bold tabular-nums ${tone.text}`}>
        {data.rubric.score}
      </p>
      <p className="text-xs text-ink-500">{data.rubric.grade} &middot; {data.rubric.gradeLabel}</p>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-xs">
        {[
          ["stars", compactNumber(data.metrics.social.stars)],
          ["forks", compactNumber(data.metrics.social.forks)],
          ["files", compactNumber(data.metrics.files.fileCount)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-ink-500">{label}</dt>
            <dd className="font-mono text-ink-100">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CategoryRow({ category }) {
  const total = category.left + category.right || 1;

  return (
    <li className="py-2.5">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={category.winner === "left" ? "font-semibold text-brand-400" : "text-ink-500"}>
          {category.left}%
        </span>
        <span className="flex items-center gap-1.5 text-ink-300">
          {category.title}
          {category.winner === "tie" ? <Minus className="size-3 text-ink-500" aria-label="tie" /> : null}
        </span>
        <span className={category.winner === "right" ? "font-semibold text-pink-400" : "text-ink-500"}>
          {category.right}%
        </span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(category.left / total) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ backgroundColor: LEFT_COLOR }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(category.right / total) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ backgroundColor: RIGHT_COLOR }}
        />
      </div>
    </li>
  );
}

export default function Compare() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!left.trim() || !right.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      setResult(await compareRepositories(left.trim(), right.trim()));
    } catch (caught) {
      setError(caught.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const field = (value, onChange, placeholder, accent) => (
    <div className="relative flex-1">
      <span
        className="absolute left-3 top-1/2 size-2.5 -translate-y-1/2 rounded-sm"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-3 pl-8 pr-3 text-sm outline-none
          transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30
          disabled:opacity-60"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight">
          <Swords className="size-7 text-brand-400" aria-hidden="true" />
          Compare repositories
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-300">
          Score two repositories against the same rubric and see which one wins each category.
          Comparisons skip the AI review, so they are fast.
        </p>
      </header>

      <form onSubmit={submit} className="card space-y-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {field(left, setLeft, "owner/repo", LEFT_COLOR)}
          <span className="text-center text-xs font-semibold uppercase tracking-widest text-ink-500">vs</span>
          {field(right, setRight, "owner/repo", RIGHT_COLOR)}
        </div>

        <button
          type="submit"
          disabled={loading || !left.trim() || !right.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3
            text-sm font-semibold text-white transition hover:bg-brand-500 focus:outline-none
            focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Comparing" : "Compare"}
        </button>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-ink-500">
          <span>Try:</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setLeft("expressjs/express");
              setRight("fastify/fastify");
            }}
            className="chip transition hover:border-brand-500/50 hover:text-brand-400"
          >
            express vs fastify
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setLeft("vuejs/core");
              setRight("sveltejs/svelte");
            }}
            className="chip transition hover:border-brand-500/50 hover:text-brand-400"
          >
            vue vs svelte
          </button>
        </div>
      </form>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Side side="left" data={result.left} color={LEFT_COLOR} isWinner={result.winner === "left"} />
            <Side side="right" data={result.right} color={RIGHT_COLOR} isWinner={result.winner === "right"} />
          </div>

          <p className="text-center text-sm text-ink-300">
            {result.winner === "tie"
              ? "Dead heat - both repositories score identically."
              : `${result[result.winner].metrics.repo.slug} wins by ${result.margin} point${result.margin === 1 ? "" : "s"}.`}
          </p>

          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-300">
                Category by category
              </h2>
              <ul className="divide-y divide-white/5">
                {result.categories.map((category) => (
                  <CategoryRow key={category.key} category={category} />
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-300">Radar</h2>
              <RadarChart
                categories={result.categories.map((category) => ({ key: category.key, title: category.title }))}
                series={[
                  {
                    name: result.left.metrics.repo.slug,
                    color: LEFT_COLOR,
                    values: result.categories.map((category) => category.left),
                  },
                  {
                    name: result.right.metrics.repo.slug,
                    color: RIGHT_COLOR,
                    values: result.categories.map((category) => category.right),
                  },
                ]}
              />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
