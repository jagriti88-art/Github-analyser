import axios from "axios";

// Empty in dev: vite proxies "/api" to the backend, so requests stay same-origin.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

/** Surface the API's own message when there is one - it is written to be read. */
function toFriendlyError(error) {
  const data = error.response?.data;
  const base =
    data?.error ??
    (error.code === "ECONNABORTED"
      ? "The analysis timed out. Try again in a moment."
      : "Could not reach the GitGrade API. Is the server running on port 5000?");

  // The server attaches a `reference` to unexpected failures so the cause is
  // visible without digging through deployment logs.
  const message = data?.reference ? `${base} (${data.reference})` : base;

  const wrapped = new Error(message);
  wrapped.status = error.response?.status;
  return wrapped;
}

async function request(promise) {
  try {
    const { data } = await promise;
    return data;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export const analyzeRepository = (repoUrl, { refresh = false } = {}) =>
  request(client.post("/api/analyze", { repoUrl }, { params: refresh ? { refresh: 1 } : undefined }));

export const compareRepositories = (left, right) =>
  request(client.post("/api/compare", { left, right }));

export const fetchStoredAnalysis = (owner, repo) =>
  request(client.get(`/api/repos/${owner}/${repo}`));

export const fetchHistory = (limit = 8) =>
  request(client.get("/api/history", { params: { limit } })).then((data) => data.items);

export const fetchLeaderboard = (limit = 25) =>
  request(client.get("/api/leaderboard", { params: { limit } })).then((data) => data.items);

export const fetchStats = () => request(client.get("/api/stats"));

export const badgeUrl = (slug, style = "flat") =>
  `${API_BASE || window.location.origin}/api/badge/${slug}.svg${style === "flat" ? "" : `?style=${style}`}`;
