import { test, expect } from "@playwright/test";
import { freeTools } from "../lib/marketing/content";
import { AI_FREE_TOOLS } from "../lib/marketing/free-tool-ai";

/**
 * The generative free tools silently stopped being generative.
 *
 * `runFreeTool` had AI branches for ten slugs, every one of them from the
 * retired LinkedIn product, and none of them a tool that still existed. The six
 * tools that promise generated output fell through to the deterministic
 * template and returned a positioning checklist to somebody who had asked for a
 * rewritten post, with a 200 and no way to tell.
 *
 * Nothing caught it because nothing asserted that the two lists agree. That is
 * what these do.
 */

/** Deterministic on purpose: scoring and splitting are algorithmic, not written. */
const DETERMINISTIC = new Set([
  "spike-rank-x",
  "spike-rank-bluesky",
  "spike-rank-linkedin",
  "thread-splitter",
]);

test.describe("free tool coverage", () => {
  test("every generative tool has a generator", () => {
    const missing = freeTools
      .map((tool) => tool.slug)
      .filter((slug) => !DETERMINISTIC.has(slug) && !AI_FREE_TOOLS[slug]);

    expect(missing, `these tools would return a template instead of generated output`).toEqual([]);
  });

  test("every generator points at a tool that exists", () => {
    const slugs = new Set(freeTools.map((tool) => tool.slug));
    const orphaned = Object.keys(AI_FREE_TOOLS).filter((slug) => !slugs.has(slug));

    expect(orphaned, "a generator keyed to a slug no page links to is dead code").toEqual([]);
  });

  test("the two sets together account for every tool", () => {
    for (const tool of freeTools) {
      const handled = DETERMINISTIC.has(tool.slug) || Boolean(AI_FREE_TOOLS[tool.slug]);
      expect(handled, `${tool.slug} is neither deterministic nor generative`).toBe(true);
    }
  });

  test("no tool is both deterministic and generative", () => {
    for (const slug of DETERMINISTIC) {
      expect(AI_FREE_TOOLS[slug], `${slug} cannot be both`).toBeUndefined();
    }
  });
});
