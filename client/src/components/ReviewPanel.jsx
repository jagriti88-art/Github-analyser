import { motion } from "framer-motion";
import { Sparkles, ThumbsUp, TriangleAlert, Briefcase, Info } from "lucide-react";
import { EFFORT_TONE } from "../lib/format";

function BulletList({ icon: Icon, iconClass, title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-300">
        <Icon className={`size-4 ${iconClass}`} aria-hidden="true" />
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-ink-100">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-500" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReviewPanel({ review }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="card p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-300">
          <Sparkles className="size-4 text-brand-400" aria-hidden="true" />
          AI review
        </h2>
        {review.model ? <span className="chip font-mono">{review.model}</span> : null}
      </div>

      {!review.available ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/10 p-3 text-xs text-warn">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {review.reason} The rubric score below is unaffected.
        </p>
      ) : null}

      {review.verdict ? (
        <p className="mb-5 border-l-2 border-brand-500/60 pl-4 text-base leading-relaxed text-ink-100">
          {review.verdict}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <BulletList icon={ThumbsUp} iconClass="text-good" title="Strengths" items={review.strengths} />
        <BulletList icon={TriangleAlert} iconClass="text-warn" title="Weaknesses" items={review.weaknesses} />
      </div>

      {review.recruiterTake ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-300">
            <Briefcase className="size-4 text-brand-400" aria-hidden="true" />
            The 60-second recruiter read
          </h3>
          <p className="text-sm leading-relaxed text-ink-100">{review.recruiterTake}</p>
        </div>
      ) : null}
    </motion.section>
  );
}

export function Roadmap({ roadmap }) {
  if (!roadmap?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="card p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
        Roadmap
      </h2>
      <p className="mb-4 mt-1 text-xs text-ink-500">Ordered by impact per unit of effort.</p>

      <ol className="space-y-3">
        {roadmap.map((item, index) => (
          <li key={item.title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-600/20 font-mono text-xs text-brand-400">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-ink-100">{item.title}</h3>
                {item.effort ? (
                  <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${EFFORT_TONE[item.effort] ?? ""}`}>
                    {item.effort} effort
                  </span>
                ) : null}
                {item.impact ? (
                  <span className="rounded-md border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 text-[11px] text-brand-400">
                    {item.impact} impact
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-ink-300">{item.why}</p>
            </div>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
