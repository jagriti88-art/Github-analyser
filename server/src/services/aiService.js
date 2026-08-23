import Groq from "groq-sdk";
import { config } from "../config.js";

const client = config.groqApiKey ? new Groq({ apiKey: config.groqApiKey }) : null;

const SYSTEM_PROMPT = `You are a senior engineer reviewing a GitHub repository for a student or early-career developer.

You are given (a) factual repository metrics and (b) a deterministic rubric score that has ALREADY been computed.
Do not invent a score and do not contradict the rubric - your job is to explain and prioritise it.

Rules:
- Be specific to THIS repository. Never give advice that would apply to any repo.
- Reference real numbers and real filenames from the data.
- Be direct and useful, not flattering. Do not pad with praise.
- Each roadmap item must be an action the developer can finish in a single sitting.

Respond with JSON only, matching this shape exactly:
{
  "verdict": "one sentence, max 25 words, describing what this repository is and how mature it is",
  "strengths": ["2 to 4 short bullets, each grounded in a specific metric"],
  "weaknesses": ["2 to 4 short bullets naming the concrete gap"],
  "roadmap": [
    {
      "title": "imperative action, max 8 words",
      "why": "one sentence on the impact",
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high"
    }
  ],
  "recruiterTake": "2 sentences on how this repository reads to a hiring engineer skimming it for 60 seconds"
}
Return between 3 and 5 roadmap items, ordered by impact-per-effort.`;

/** Trim metrics down to what the model actually needs, so the prompt stays cheap and focused. */
function buildUserPrompt(data, rubric) {
  const payload = {
    repository: {
      slug: data.repo.slug,
      description: data.repo.description,
      topics: data.repo.topics,
      license: data.repo.license,
      ageDays: data.repo.ageDays,
      daysSincePush: data.repo.daysSincePush,
      isFork: data.repo.isFork,
      isArchived: data.repo.isArchived,
    },
    social: data.social,
    languages: data.languages.slice(0, 6),
    commits: data.commits,
    files: {
      fileCount: data.files.fileCount,
      topLevelDirs: data.files.topLevelDirs,
      rootFiles: data.files.rootFiles,
      testFileCount: data.files.testFileCount,
      ciFiles: data.files.ciFiles,
      lintFiles: data.files.lintFiles,
      committedSecrets: data.files.committedSecrets,
    },
    readme: data.readme,
    rubric: {
      score: rubric.score,
      grade: rubric.grade,
      categories: rubric.categories.map((c) => ({ title: c.title, percent: c.percent })),
      biggestGaps: rubric.opportunities.map((o) => `${o.category} - ${o.label}: ${o.detail}`),
    },
  };

  return `Repository analysis data:\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

/** Returned when Groq is unconfigured or unreachable, so the endpoint never hard-fails. */
function fallbackReview(rubric, reason) {
  return {
    available: false,
    reason,
    verdict: `Scored ${rubric.score}/100 (${rubric.grade}) by the rubric. AI commentary is unavailable.`,
    strengths: rubric.categories
      .filter((c) => c.percent >= 70)
      .map((c) => `${c.title}: ${c.percent}% of available points`),
    weaknesses: rubric.categories
      .filter((c) => c.percent < 50)
      .map((c) => `${c.title}: ${c.percent}% of available points`),
    roadmap: rubric.opportunities.slice(0, 5).map((o) => ({
      title: o.label,
      why: o.detail,
      effort: o.missing >= 5 ? "medium" : "low",
      impact: o.missing >= 5 ? "high" : "medium",
    })),
    recruiterTake: null,
  };
}

export async function reviewRepo(data, rubric) {
  if (!client) {
    return fallbackReview(rubric, "GROQ_API_KEY is not configured on the server.");
  }

  try {
    const completion = await client.chat.completions.create({
      model: config.groqModel,
      temperature: 0.3,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(data, rubric) },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

    return {
      available: true,
      model: config.groqModel,
      verdict: parsed.verdict ?? null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      roadmap: Array.isArray(parsed.roadmap) ? parsed.roadmap : [],
      recruiterTake: parsed.recruiterTake ?? null,
    };
  } catch (error) {
    // A failed AI call should degrade the response, not break it.
    console.error("[ai] review failed:", error.message);
    return fallbackReview(rubric, `AI review failed: ${error.message}`);
  }
}
