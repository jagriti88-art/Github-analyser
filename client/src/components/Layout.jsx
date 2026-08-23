import { NavLink, Outlet } from "react-router-dom";
import { GitGraph, GitCompare, Trophy, Home as HomeIcon } from "lucide-react";

const LINKS = [
  { to: "/", label: "Analyse", icon: HomeIcon, end: true },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <GitGraph className="size-5 text-brand-400" aria-hidden="true" />
            GitGrade
          </NavLink>

          <div className="ml-auto flex items-center gap-1">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                    isActive ? "bg-white/10 text-ink-100" : "text-ink-300 hover:bg-white/5 hover:text-ink-100"
                  }`
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-ink-500">
        Scores are heuristics, not judgements. Data comes from the public GitHub REST API.
      </footer>
    </div>
  );
}
