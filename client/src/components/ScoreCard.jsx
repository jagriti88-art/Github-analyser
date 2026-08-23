import { motion } from "framer-motion";
import { ExternalLink, GitFork, Star, Eye, CircleAlert, Scale, Clock } from "lucide-react";
import { compactNumber, relativeDays, scoreTone } from "../lib/format";

const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score }) {
  const tone = scoreTone(score);
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <svg viewBox="0 0 150 150" className="size-36 shrink-0 -rotate-90" role="img"
      aria-label={`Overall score ${score} out of 100`}>
      <circle cx="75" cy="75" r={RADIUS} fill="none" strokeWidth="10" className="stroke-white/10" />
      <motion.circle
        cx="75"
        cy="75"
        r={RADIUS}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className={tone.stroke}
        strokeDasharray={CIRCUMFERENCE}
        initial={{ strokeDashoffset: CIRCUMFERENCE }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
    </svg>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-ink-500" aria-hidden="true" />
      <span className="text-sm text-ink-100">{value}</span>
      <span className="text-xs text-ink-500">{label}</span>
    </div>
  );
}

/** Sparkline of past scores, shown once a repo has been analysed more than once. */
function ScoreTimeline({ timeline }) {
  if (!timeline || timeline.length < 2) return null;

  const scores = timeline.map((point) => point.score);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const points = scores
    .map((score, index) => {
      const x = (index / (scores.length - 1)) * 100;
      const y = 24 - ((score - min) / (max - min || 1)) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  const delta = scores.at(-1) - scores[0];

  return (
    <div className="mt-4 flex items-center gap-3">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 w-24" aria-hidden="true">
        <polyline points={points} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke"
          className={delta >= 0 ? "stroke-good" : "stroke-bad"} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="text-xs text-ink-500">
        {scores.length} analyses,{" "}
        <span className={delta >= 0 ? "text-good" : "text-bad"}>
          {delta >= 0 ? "+" : ""}{delta}
        </span>{" "}
        since first
      </span>
    </div>
  );
}

export default function ScoreCard({ metrics, rubric, analyzedAt, cached, timeline }) {
  const { repo, social, languages } = metrics;
  const tone = scoreTone(rubric.score);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="card p-6"
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative grid place-items-center">
          <ScoreRing score={rubric.score} />
          <div className="absolute grid place-items-center text-center">
            <span className={`text-4xl font-bold tabular-nums ${tone.text}`}>{rubric.score}</span>
            <span className="text-xs text-ink-500">/ 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xl font-semibold hover:text-brand-400"
            >
              {repo.slug}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            <span className={`rounded-lg border px-2 py-0.5 text-sm font-bold ${tone.text} border-current/30`}>
              {rubric.grade}
            </span>
            {repo.isArchived ? <span className="chip text-warn">archived</span> : null}
            {repo.isFork ? <span className="chip">fork</span> : null}
          </div>

          <p className="mt-2 text-sm text-ink-300">
            {repo.description ?? <span className="italic text-ink-500">No description set on GitHub.</span>}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <Stat icon={Star} label="stars" value={compactNumber(social.stars)} />
            <Stat icon={GitFork} label="forks" value={compactNumber(social.forks)} />
            <Stat icon={Eye} label="watchers" value={compactNumber(social.watchers)} />
            <Stat icon={CircleAlert} label="open issues" value={compactNumber(social.openIssues)} />
            <Stat icon={Scale} label="license" value={repo.license ?? "none"} />
            <Stat icon={Clock} label="last push" value={relativeDays(repo.daysSincePush)} />
          </div>

          {languages.length ? (
            <div className="mt-4">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
                {languages.slice(0, 6).map((language, index) => (
                  <div
                    key={language.name}
                    style={{
                      width: `${language.percent}%`,
                      backgroundColor: `hsl(${(index * 58 + 205) % 360} 70% 60%)`,
                    }}
                    title={`${language.name} ${language.percent}%`}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
                {languages.slice(0, 5).map((language) => (
                  <span key={language.name}>
                    {language.name} {language.percent}%
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <ScoreTimeline timeline={timeline} />
        </div>
      </div>

      <p className="mt-5 border-t border-white/5 pt-3 text-xs text-ink-500">
        {rubric.gradeLabel} &middot; {rubric.earned} of {rubric.max} rubric points &middot; analysed{" "}
        {new Date(analyzedAt).toLocaleTimeString()}
        {cached ? " (cached)" : ""}
      </p>
    </motion.section>
  );
}
