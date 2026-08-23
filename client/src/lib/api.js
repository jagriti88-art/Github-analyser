import axios from "axios";

// Empty in dev: vite proxies "/api" to the backend, so requests stay same-origin.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

const client = axios.create({
  baseURL,
  timeout: 45_000,
  headers: { "Content-Type": "application/json" },
});

export async function analyzeRepository(repoUrl, { refresh = false } = {}) {
  try {
    const { data } = await client.post("/api/analyze", { repoUrl }, {
      params: refresh ? { refresh: 1 } : undefined,
    });
    return data;
  } catch (error) {
    // Surface the API's own message when there is one - it is written to be read.
    const message =
      error.response?.data?.error ??
      (error.code === "ECONNABORTED"
        ? "The analysis timed out. Try again in a moment."
        : "Could not reach the GitGrade API. Is the server running on port 5000?");
    throw new Error(message);
  }
}
