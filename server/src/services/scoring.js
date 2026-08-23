/**
 * Deterministic repository scoring.
 *
 * The original version asked the LLM for a number, which meant the same repo could
 * score 62 and then 81 a minute later. Scoring here is pure and reproducible; the
 * LLM is only asked to explain and prioritise the findings this file produces.
 *
 * Every check reports the points it earned out of the points available, plus a
 * human-readable reason, so the UI can show *why* a repo scored what it scored.
 */

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** Linear ramp: 0 at `min`, 1 at `max`. */
const ramp = (value, min, max) => clamp01((value - min) / (max - min));

function check(label, weight, ratio, detail) {
  const earned = Number((weight * clamp01(ratio)).toFixed(2));
  return {
    label,
    weight,
    earned,
    status: earned >= weight * 0.99 ? "pass" : earned > 0 ? "partial" : "fail",
    detail,
  };
}

function documentation({ repo, readme }) {
  const checks = [];

  checks.push(
    check("README present", 6, readme.exists ? 1 : 0,
      readme.exists ? `${readme.name} found (${readme.lines} lines)` : "No README found in the repository root")
  );

  checks.push(
    check("README depth", 6, ramp(readme.bytes, 300, 3000),
      readme.bytes >= 3000
        ? "README is substantial"
        : `README is ${readme.bytes} characters; aim for 3000+ covering what, why and how`)
  );

  const wanted = ["install", "usage", "features", "techStack"];
  const present = wanted.filter((key) => readme.sections?.[key]);
  checks.push(
    check("Key README sections", 5, present.length / wanted.length,
      present.length === wanted.length
        ? "Covers install, usage, features and tech stack"
        : `Missing section(s): ${wanted.filter((k) => !present.includes(k)).join(", ")}`)
  );

  checks.push(
    check("Repository description", 3, repo.description ? 1 : 0,
      repo.description ? "About section is filled in" : "No description set on the GitHub About panel")
  );

  checks.push(
    check("Topics / discoverability", 2, ramp(repo.topics.length, 0, 4),
      repo.topics.length ? `${repo.topics.length} topic(s) set` : "No topics set, which hurts discoverability")
  );

  return { key: "documentation", title: "Documentation", checks };
}

function testingAndQuality({ files }) {
  const checks = [];

  checks.push(
    check("Automated tests", 9, files.testFileCount > 0 ? Math.min(1, 0.6 + ramp(files.testFileCount, 1, 10) * 0.4) : 0,
      files.testFileCount
        ? `${files.testFileCount} test file(s) detected`
        : "No test files detected; even a handful of unit tests changes how a project reads")
  );

  checks.push(
    check("CI pipeline", 6, files.ciFiles.length ? 1 : 0,
      files.ciFiles.length
        ? `CI configured (${files.ciFiles[0]})`
        : "No CI workflow; a GitHub Actions file that runs lint and tests on every push is a strong signal")
  );

  checks.push(
    check("Linter / formatter config", 3, files.lintFiles.length ? 1 : 0,
      files.lintFiles.length ? `Config found: ${files.lintFiles.slice(0, 3).join(", ")}` : "No linter or formatter configuration")
  );

  checks.push(
    check("Containerisation", 2, files.containerFiles.length ? 1 : 0,
      files.containerFiles.length ? "Dockerfile or compose file present" : "No Dockerfile; optional, but it makes the project trivially runnable")
  );

  return { key: "quality", title: "Testing & Quality", checks };
}

function activity({ repo, commits, social }) {
  const checks = [];

  const days = repo.daysSincePush;
  checks.push(
    check("Recent activity", 7, days === null ? 0 : 1 - ramp(days, 30, 365),
      days === null ? "No push date available" : `Last push was ${days} day(s) ago`)
  );

  checks.push(
    check("Commit volume", 5, ramp(commits.sampled, 5, 60),
      commits.sampled >= 100
        ? "100+ recent commits (sample capped at 100)"
        : `${commits.sampled} commit(s) on the default branch`)
  );

  const cadence =
    commits.spanDays && commits.sampled > 1 ? commits.sampled / Math.max(commits.spanDays, 1) : 0;
  checks.push(
    check("Sustained cadence", 3, ramp(cadence, 0.05, 0.5),
      commits.spanDays
        ? `${commits.sampled} commits across ${commits.spanDays} day(s)`
        : "Not enough history to judge cadence")
  );

  checks.push(
    check("Releases / versioning", 3, ramp(social.releases, 0, 2),
      social.releases ? `${social.releases} release(s) published` : "No tagged releases")
  );

  return { key: "activity", title: "Activity & Maintenance", checks };
}

function structure({ files, languages, repo }) {
  const checks = [];

  // A flat layout is fine for a ten-file utility; it is a problem for a real application.
  const smallEnoughToBeFlat = files.fileCount <= 15;
  checks.push(
    check("Source organised into folders", 5, files.hasSourceDir || smallEnoughToBeFlat ? 1 : 0,
      files.hasSourceDir
        ? "Code lives in dedicated directories"
        : smallEnoughToBeFlat
          ? "Flat layout, acceptable at this size"
          : `No src/app/lib directory across ${files.fileCount} files; everything is flat`)
  );

  // A crowded root is a common student-project smell.
  checks.push(
    check("Tidy repository root", 4, 1 - ramp(files.rootFileCount, 12, 30),
      `${files.rootFileCount} file(s) in the repository root`)
  );

  checks.push(
    check("Dependency manifest & lockfile", 4,
      (files.manifestFiles.length ? 0.5 : 0) + (files.lockFiles.length ? 0.5 : 0),
      files.manifestFiles.length
        ? files.lockFiles.length
          ? "Manifest and lockfile both committed"
          : "Manifest committed but no lockfile - builds are not reproducible"
        : "No dependency manifest detected")
  );

  checks.push(
    check("Meaningful codebase size", 2, ramp(files.fileCount, 5, 40),
      `${files.fileCount}${files.truncated ? "+" : ""} file(s), ${languages.length} language(s), ${repo.sizeKb} KB`)
  );

  return { key: "structure", title: "Project Structure", checks };
}

function community({ social, commits, repo, files }) {
  const checks = [];

  // Logarithmic: going 0 -> 10 stars matters far more than 900 -> 1000.
  const starScore = ramp(Math.log10(social.stars + 1), 0, 2.5);
  checks.push(
    check("Stars", 4, starScore, `${social.stars} star(s)`)
  );

  checks.push(
    check("Contributors", 4, ramp(social.contributors ?? commits.authors, 1, 4),
      `${social.contributors ?? commits.authors} contributor(s) detected`)
  );

  checks.push(
    check("Pull-request workflow", 3, ramp(social.pullRequests ?? 0, 0, 5),
      social.pullRequests ? `${social.pullRequests} pull request(s)` : "No pull requests - work appears to be pushed straight to the default branch")
  );

  checks.push(
    check("License", 3, repo.license && repo.license !== "NOASSERTION" ? 1 : 0,
      repo.license && repo.license !== "NOASSERTION" ? `${repo.license} licensed` : "No license, so nobody legally knows if they can use this")
  );

  checks.push(
    check("Contribution guide", 1, files.hasContributing ? 1 : 0,
      files.hasContributing ? "CONTRIBUTING guide present" : "No CONTRIBUTING guide")
  );

  return { key: "community", title: "Collaboration & Community", checks };
}

function hygiene({ files, commits }) {
  const checks = [];

  checks.push(
    check(".gitignore present", 3, files.hasGitignore ? 1 : 0,
      files.hasGitignore ? ".gitignore committed" : "No .gitignore - build output and local files will leak into history")
  );

  checks.push(
    check("No committed secrets", 4, files.committedSecrets.length ? 0 : 1,
      files.committedSecrets.length
        ? `Possible secret file(s) committed: ${files.committedSecrets.slice(0, 3).join(", ")}`
        : "No credential-shaped files found in the tree")
  );

  const messageQuality =
    0.5 * ramp(commits.medianMessageLength, 10, 40) +
    0.5 * (1 - commits.lowEffortRatio) +
    0.2 * commits.conventionalRatio;
  checks.push(
    check("Commit message quality", 3, messageQuality,
      commits.sampled
        ? `Median subject ${commits.medianMessageLength} chars, ${Math.round(commits.lowEffortRatio * 100)}% low-effort, ${Math.round(commits.conventionalRatio * 100)}% conventional`
        : "No commits to inspect")
  );

  return { key: "hygiene", title: "Security & Hygiene", checks };
}

const GRADES = [
  [90, "A+", "Exceptional"],
  [80, "A", "Strong"],
  [70, "B", "Solid"],
  [60, "C", "Decent, with clear gaps"],
  [45, "D", "Needs work"],
  [0, "E", "Early stage"],
];

/** Turns fetched repo data into a reproducible 0-100 score with a full audit trail. */
export function scoreRepo(data) {
  const categories = [
    documentation(data),
    testingAndQuality(data),
    activity(data),
    structure(data),
    community(data),
    hygiene(data),
  ].map((category) => {
    const max = category.checks.reduce((sum, c) => sum + c.weight, 0);
    const earned = category.checks.reduce((sum, c) => sum + c.earned, 0);
    return {
      ...category,
      max,
      earned: Number(earned.toFixed(1)),
      percent: max ? Math.round((earned / max) * 100) : 0,
    };
  });

  const max = categories.reduce((sum, c) => sum + c.max, 0);
  const earned = categories.reduce((sum, c) => sum + c.earned, 0);
  const score = Math.round((earned / max) * 100);

  const [, grade, gradeLabel] = GRADES.find(([threshold]) => score >= threshold);

  // The lowest-scoring checks, weighted by how many points are on the table.
  const opportunities = categories
    .flatMap((category) =>
      category.checks.map((c) => ({ ...c, category: category.title, missing: Number((c.weight - c.earned).toFixed(2)) }))
    )
    .filter((c) => c.missing > 0.5)
    .sort((a, b) => b.missing - a.missing)
    .slice(0, 8);

  return { score, grade, gradeLabel, earned: Number(earned.toFixed(1)), max, categories, opportunities };
}
