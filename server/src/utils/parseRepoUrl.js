import { badRequest } from "./errors.js";

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const NAME = /^[A-Za-z0-9_.-]+$/;

/**
 * Accepts any of:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/main/src
 *   git@github.com:owner/repo.git
 *   github.com/owner/repo
 *   owner/repo
 */
export function parseRepoUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw badRequest("Provide a GitHub repository URL, e.g. https://github.com/facebook/react");
  }

  let value = input.trim();

  // git@github.com:owner/repo.git -> github.com/owner/repo.git
  value = value.replace(/^git@([^:]+):/, "$1/");
  value = value.replace(/^git\+/, "");

  // Bare "owner/repo" shorthand (no host segment, so no dot before the slash).
  if (/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(value)) value = `github.com/${value}`;

  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw badRequest(`"${input}" is not a valid URL.`);
  }

  if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
    throw badRequest(`Only github.com repositories are supported (got "${url.hostname}").`);
  }

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) {
    throw badRequest("The URL must point at a repository, e.g. https://github.com/owner/repo");
  }

  const repo = rawRepo.replace(/\.git$/i, "");

  if (!NAME.test(owner) || !NAME.test(repo)) {
    throw badRequest(`"${owner}/${repo}" is not a valid owner/repo pair.`);
  }

  return { owner, repo, slug: `${owner}/${repo}` };
}
