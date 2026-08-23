import axios from "axios";
import { config } from "../config.js";
import { notFound, rateLimited, upstreamFailure } from "../utils/errors.js";

const github = axios.create({
  baseURL: "https://api.github.com",
  timeout: 15_000,
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gitgrade-analyzer",
    ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {}),
  },
});

/** Turn an axios/GitHub failure into a message a user can act on. */
function translateGithubError(error, slug) {
  const status = error.response?.status;
  const remaining = error.response?.headers?.["x-ratelimit-remaining"];

  if (status === 404) {
    return notFound(`Repository "${slug}" was not found, or it is private.`);
  }
  if (status === 403 && remaining === "0") {
    const resetAt = Number(error.response.headers["x-ratelimit-reset"]) * 1000;
    const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
    return rateLimited(
      config.githubToken
        ? `GitHub rate limit reached. Try again in ~${minutes} minute(s).`
        : `GitHub rate limit reached (60/hour without a token). Add GITHUB_TOKEN to the server .env, or retry in ~${minutes} minute(s).`
    );
  }
  if (status === 451) {
    return upstreamFailure(`Repository "${slug}" is unavailable for legal reasons.`);
  }
  if (error.code === "ECONNABORTED") {
    return upstreamFailure("GitHub took too long to respond. Please try again.");
  }
  return upstreamFailure(`GitHub request failed: ${error.message}`);
}

/** Endpoints that are allowed to fail (empty repo, no releases, no readme). */
async function optional(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

/** Reads a total count from the Link rel="last" header of a per_page=1 request. */
async function countViaPagination(path) {
  const res = await github.get(path, {
    params: { per_page: 1 },
    validateStatus: (s) => s < 500,
  });
  if (res.status >= 400) return null;

  const link = res.headers.link;
  const last = link && /[?&]page=(\d+)>; rel="last"/.exec(link);
  if (last) return Number(last[1]);
  return Array.isArray(res.data) ? res.data.length : null;
}

const RE = {
  test: [
    /(^|\/)(tests?|__tests__|spec|specs|e2e|cypress)\//i,
    /\.(test|spec)\.[cm]?[jt]sx?$/i,
    /(^|\/)tests?\.[cm]?[jt]sx?$/i,
    /(^|\/)test_[^/]+\.py$/i,
    /_test\.(py|go|rb)$/i,
    /[^/]+Test\.(java|kt|cs)$/i,
  ],
  ci: [
    /^\.github\/workflows\/.+\.ya?ml$/i,
    /^\.gitlab-ci\.ya?ml$/i,
    /^\.circleci\//i,
    /^(Jenkinsfile|azure-pipelines\.ya?ml|\.travis\.ya?ml)$/i,
  ],
  lint: [
    /^\.eslintrc(\..+)?$/i,
    /^eslint\.config\.[cm]?[jt]s$/i,
    /^\.prettierrc(\..+)?$/i,
    /^(ruff|setup)\.cfg$/i,
    /^\.flake8$/i,
    /^(biome|tsconfig)\.json$/i,
    /^\.editorconfig$/i,
  ],
  container: [
    /^Dockerfile(\..+)?$/i,
    /^docker-compose(\..+)?\.ya?ml$/i,
    /^(k8s|kubernetes|helm)\//i,
  ],
  lockfile: [
    /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/i,
    /^(poetry\.lock|Pipfile\.lock|uv\.lock)$/i,
    /^(go\.sum|Cargo\.lock|composer\.lock|Gemfile\.lock)$/i,
  ],
  manifest: [
    /^package\.json$/i,
    /^(pyproject\.toml|setup\.py|requirements\.txt)$/i,
    /^(go\.mod|Cargo\.toml|pom\.xml|build\.gradle(\.kts)?|composer\.json|Gemfile)$/i,
  ],
  // Files that should never be committed.
  secret: [
    /(^|\/)\.env$/i,
    /(^|\/)\.env\.(local|production|development)$/i,
    /(^|\/)(id_rsa|id_ed25519)$/i,
    /\.(pem|pfx|p12|keystore)$/i,
    /(^|\/)(credentials|serviceaccount|service-account)\.json$/i,
  ],
  sourceDir: [
    /^(src|app|lib|packages|server|client|backend|frontend|cmd|internal)\//i,
  ],
};

const matchesAny = (patterns, path) => patterns.some((re) => re.test(path));

function summarizeTree(treeResponse) {
  const nodes = treeResponse?.tree ?? [];
  const files = nodes.filter((node) => node.type === "blob").map((node) => node.path);
  const matched = (key) => files.filter((path) => matchesAny(RE[key], path));

  const rootFiles = files.filter((path) => !path.includes("/"));

  return {
    fileCount: files.length,
    truncated: Boolean(treeResponse?.truncated),
    rootFiles: rootFiles.slice(0, 60),
    rootFileCount: rootFiles.length,
    topLevelDirs: nodes
      .filter((n) => n.type === "tree" && !n.path.includes("/"))
      .map((n) => n.path),
    testFiles: matched("test").slice(0, 20),
    testFileCount: matched("test").length,
    ciFiles: matched("ci"),
    lintFiles: matched("lint"),
    containerFiles: matched("container"),
    lockFiles: matched("lockfile"),
    manifestFiles: matched("manifest"),
    committedSecrets: matched("secret"),
    hasSourceDir: files.some((path) => matchesAny(RE.sourceDir, path)),
    hasGitignore: rootFiles.some((f) => f.toLowerCase() === ".gitignore"),
    hasContributing: files.some((f) => /^(\.github\/)?CONTRIBUTING(\.md|\.rst)?$/i.test(f)),
    hasChangelog: rootFiles.some((f) => /^CHANGELOG(\.md)?$/i.test(f)),
    hasDocsDir: files.some((f) => /^docs?\//i.test(f)),
  };
}

const CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s/i;
const LOW_EFFORT = /^(update|updated|updates|change|changes|changed|fix|fixes|fixed|wip|test|temp|asdf|final|new file|commit|\.|\+)$/i;

function summarizeCommits(commits) {
  if (!commits.length) {
    return {
      sampled: 0,
      authors: 0,
      conventionalRatio: 0,
      lowEffortRatio: 0,
      medianMessageLength: 0,
      spanDays: null,
      latestCommitAt: null,
    };
  }

  const subjects = commits.map((c) => (c.commit?.message ?? "").split("\n")[0].trim());
  const authors = new Set(
    commits
      .map((c) => c.author?.login ?? c.commit?.author?.email ?? c.commit?.author?.name)
      .filter(Boolean)
  );

  const lengths = subjects.map((s) => s.length).sort((a, b) => a - b);
  const dates = commits
    .map((c) => new Date(c.commit?.author?.date ?? c.commit?.committer?.date))
    .filter((d) => !Number.isNaN(d.getTime()));

  const newest = dates.length ? new Date(Math.max(...dates)) : null;
  const oldest = dates.length ? new Date(Math.min(...dates)) : null;

  return {
    sampled: commits.length,
    authors: authors.size,
    conventionalRatio: subjects.filter((s) => CONVENTIONAL.test(s)).length / subjects.length,
    lowEffortRatio: subjects.filter((s) => LOW_EFFORT.test(s)).length / subjects.length,
    medianMessageLength: lengths[Math.floor(lengths.length / 2)],
    spanDays: newest && oldest ? Math.round((newest - oldest) / 86_400_000) : null,
    latestCommitAt: newest ? newest.toISOString() : null,
  };
}

function summarizeReadme(readme) {
  if (!readme) {
    return { exists: false, bytes: 0, lines: 0, headings: 0, sections: {}, hasBadges: false, hasImages: false };
  }

  const text = Buffer.from(
    readme.content ?? "",
    readme.encoding === "base64" ? "base64" : "utf8"
  ).toString("utf8");
  const lower = text.toLowerCase();
  const has = (...words) => words.some((w) => lower.includes(w));

  return {
    exists: true,
    name: readme.name,
    bytes: text.length,
    lines: text.split("\n").length,
    headings: (text.match(/^#{1,6}\s/gm) ?? []).length,
    hasBadges: /img\.shields\.io|\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/i.test(text),
    hasImages: /!\[[^\]]*\]\([^)]*\)/.test(text),
    sections: {
      install: has("## install", "getting started", "setup", "quick start", "prerequisites"),
      usage: has("## usage", "how to use", "example", "```"),
      features: has("## features", "what it does"),
      techStack: has("tech stack", "built with", "technologies"),
      license: has("## license", "## licence"),
      contributing: has("contributing", "pull request"),
    },
  };
}

const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso)) / 86_400_000) : null);

/** Fetches everything the scorer needs. The core repo call is required; the rest degrade gracefully. */
export async function fetchRepoData(owner, repo) {
  const slug = `${owner}/${repo}`;
  const base = `/repos/${owner}/${repo}`;

  let info;
  try {
    ({ data: info } = await github.get(base));
  } catch (error) {
    throw translateGithubError(error, slug);
  }

  const branch = info.default_branch ?? "main";

  const [commits, languages, tree, readme, releases, contributorCount, pullRequestCount] =
    await Promise.all([
      optional(github.get(`${base}/commits`, { params: { per_page: 100 } }).then((r) => r.data), []),
      optional(github.get(`${base}/languages`).then((r) => r.data), {}),
      optional(
        github
          .get(`${base}/git/trees/${encodeURIComponent(branch)}`, { params: { recursive: 1 } })
          .then((r) => r.data),
        { tree: [] }
      ),
      optional(github.get(`${base}/readme`).then((r) => r.data), null),
      optional(github.get(`${base}/releases`, { params: { per_page: 5 } }).then((r) => r.data), []),
      optional(countViaPagination(`${base}/contributors`), null),
      optional(countViaPagination(`${base}/pulls?state=all`), null),
    ]);

  const totalBytes = Object.values(languages).reduce((sum, n) => sum + n, 0) || 1;
  const languageBreakdown = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: Number(((bytes / totalBytes) * 100).toFixed(1)),
    }));

  return {
    repo: {
      slug,
      name: info.name,
      owner: info.owner?.login,
      avatar: info.owner?.avatar_url ?? null,
      description: info.description,
      url: info.html_url,
      homepage: info.homepage || null,
      defaultBranch: branch,
      isFork: info.fork,
      isArchived: info.archived,
      isTemplate: info.is_template,
      license: info.license?.spdx_id ?? null,
      topics: info.topics ?? [],
      sizeKb: info.size,
      createdAt: info.created_at,
      pushedAt: info.pushed_at,
      ageDays: daysSince(info.created_at),
      daysSincePush: daysSince(info.pushed_at),
    },
    social: {
      stars: info.stargazers_count,
      forks: info.forks_count,
      watchers: info.subscribers_count,
      openIssues: info.open_issues_count,
      contributors: contributorCount,
      pullRequests: pullRequestCount,
      hasIssuesEnabled: info.has_issues,
      releases: releases.length,
      latestRelease: releases[0]
        ? { tag: releases[0].tag_name, publishedAt: releases[0].published_at }
        : null,
    },
    languages: languageBreakdown,
    commits: summarizeCommits(commits),
    files: summarizeTree(tree),
    readme: summarizeReadme(readme),
  };
}
