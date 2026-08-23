import test from "node:test";
import assert from "node:assert/strict";
import { parseRepoUrl } from "../src/utils/parseRepoUrl.js";

const accepted = [
  ["https://github.com/facebook/react", "facebook/react"],
  ["https://github.com/facebook/react/", "facebook/react"],
  ["https://github.com/facebook/react.git", "facebook/react"],
  ["https://github.com/facebook/react/tree/main/packages", "facebook/react"],
  ["https://www.github.com/facebook/react?tab=readme", "facebook/react"],
  ["github.com/facebook/react", "facebook/react"],
  ["facebook/react", "facebook/react"],
  ["git@github.com:facebook/react.git", "facebook/react"],
  ["  https://github.com/facebook/react  ", "facebook/react"],
];

for (const [input, expected] of accepted) {
  test(`accepts ${input.trim()}`, () => {
    assert.equal(parseRepoUrl(input).slug, expected);
  });
}

const rejected = [
  ["", "empty string"],
  [null, "null"],
  ["https://gitlab.com/owner/repo", "non-GitHub host"],
  ["https://github.com/facebook", "owner without repo"],
  ["https://github.com", "bare host"],
  ["not a url at all with spaces", "garbage"],
];

for (const [input, label] of rejected) {
  test(`rejects ${label}`, () => {
    assert.throws(() => parseRepoUrl(input), { status: 400 });
  });
}
