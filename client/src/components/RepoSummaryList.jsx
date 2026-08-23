import { Link } from "react-router-dom";
import { Star, Trophy } from "lucide-react";

import { compactNumber, relativeDays, scoreTone } from "../lib/format";

const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso)) / 86_400_000);

const MEDAL = ["text-yellow-400", "text-slate-300", "text-amber-600"];

/** Shared row list used by both the recent-analyses panel and the leaderboard. */
export default function RepoSummaryList({ items, ranked = false, emptyMessage }) {
  if (!items?.length) {
    return <p className="py-6 text-center text-sm text-ink-500">{emptyMessage}</p>;
  }

  return (
    <ol className="divide-y divide-white/5">
      {items.map((item, index) => {
        const tone = scoreTone(item.score);

        return (
          <li key={item.slug}>
            <Link
              to={`/r/${item.slug}`}
              className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
            >
              {ranked ? (
                <span className="w-6 shrink-0 text-center font-mono text-xs text-ink-500">
                  {index < 3 ? (
                    <Trophy className={`mx-auto size-4 ${MEDAL[index]}`} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-100">{item.slug}</p>
                <p className="truncate text-xs text-ink-500">
                  {item.description ?? "No description"}
                </p>
              </div>

              <span className="hidden shrink-0 items-center gap-1 text-xs text-ink-500 sm:flex">
                <Star className="size-3" aria-hidden="true" />
                {compactNumber(item.stars)}
              </span>

              {item.language ? (
                <span className="hidden w-20 shrink-0 truncate text-right text-xs text-ink-500 md:block">
                  {item.language}
                </span>
              ) : null}

              <span className="hidden w-24 shrink-0 text-right text-xs text-ink-500 lg:block">
                {relativeDays(daysAgo(item.analyzedAt))}
              </span>

              <span className={`w-14 shrink-0 text-right font-mono text-sm font-semibold tabular-nums ${tone.text}`}>
                {item.score}
                <span className="ml-1 text-[10px] text-ink-500">{item.grade}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
