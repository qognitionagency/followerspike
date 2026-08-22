import { check, scoreChecks } from "@/lib/rank/score";
import type { RankCheck, RankResult } from "@/lib/rank/types";

/**
 * X Spike Rank scores text the member pastes in themselves.
 *
 * This exists because the tool was being sold and never ran. `spike-rank-x` had
 * a slug, a page, a nav entry badged "New", and a handle validator in the API
 * route, but `runFreeTool` had no branch for it, so every request fell through
 * to the generic positioning writeup. Someone who asked for a score got prose
 * that never looked at their profile.
 *
 * Pasted text rather than a live read, because X has no unauthenticated profile
 * endpoint any more. The v2 user lookup needs a bearer token from a registered
 * app, and this tool is deliberately ungated: it is the top of the funnel and
 * runs for people who have not signed up. Bluesky can be read live because its
 * AppView is genuinely public; X cannot, and inventing a score from a handle
 * alone would be worse than asking for a paste.
 *
 * Cadence and engagement cannot be established from a profile paste, so their
 * checks report "unknown" and `scoreChecks` excludes them from the total rather
 * than counting them as failures. A quiet account is not scored as a bad one.
 */

const AUDIENCE_MARKERS = /\b(for|helping|help|i help|we help|so that|who want|serving|building for)\b/i;
const OUTCOME_MARKERS = /\b(grow|growth|revenue|reduce|save|increase|launch|scale|ship|shipping|hire|raise|convert|build|building)\b/i;
const METRIC_PATTERN = /(\$\s?\d|\d+\s?%|\b\d[\d,.]*\s?(k|m|x|mrr|arr|users?|customers?|clients?|founders?|subscribers?|companies|teams|years?)\b)/i;
const LINK_PATTERN = /(https?:\/\/\S+|\b[a-z0-9-]+\.(com|io|co|dev|ai|app|xyz|net|org|sh|to)\b)/i;
const CTA_MARKERS = /\b(subscribe|newsletter|sign up|join|get the|free|download|read|book a|reply|waitlist)\b/i;
const BUILDING_MARKERS = /\b(building|founder|co-?founder|ceo|creator|writing|shipping|making)\b/i;
const HANDLE_LINE = /^@[A-Za-z0-9_]{1,15}$/;
const COUNT_LINE = /^([\d,.]+[KM]?)\s+(following|followers)$/i;

/** X caps a bio at 160 characters, which is what "uses the space" is measured against. */
const BIO_LIMIT = 160;

type Parsed = {
  raw: string;
  displayName: string;
  handle: string;
  bio: string;
  hasLink: boolean;
  followers: number | null;
  hasPinnedPost: boolean;
};

/**
 * A pasted X profile has no guaranteed structure, so each field is recognised by
 * its own shape rather than by position: the handle is the `@` line, the counts
 * are the "1,234 Followers" lines, and the bio is the longest remaining line of
 * prose. Anything not recognised is simply absent, never guessed.
 */
export function parsePastedXProfile(raw: string): Parsed {
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const handleLine = lines.find((line) => HANDLE_LINE.test(line));
  const handle = handleLine ? handleLine.slice(1) : "";

  // The display name is the first line that is not the handle and not chrome.
  const displayName =
    lines.find(
      (line) =>
        !HANDLE_LINE.test(line) &&
        !COUNT_LINE.test(line) &&
        !/^(follow|following|message|edit profile|joined)\b/i.test(line) &&
        line.length <= 60
    ) ?? "";

  const followers = (() => {
    const line = lines.find((candidate) => /followers/i.test(candidate));
    if (!line) return null;
    const match = line.match(/([\d,.]+)\s*([KM])?/i);
    if (!match) return null;
    const base = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(base)) return null;
    const suffix = match[2]?.toUpperCase();
    return Math.round(suffix === "M" ? base * 1_000_000 : suffix === "K" ? base * 1_000 : base);
  })();

  // The bio is the longest line that is not the name, the handle, a count, or
  // the joined date. Bios wrap, so lines that follow it are joined in.
  const bioCandidates = lines.filter(
    (line) =>
      line !== displayName &&
      !HANDLE_LINE.test(line) &&
      !COUNT_LINE.test(line) &&
      !/followers|following/i.test(line) &&
      !/^joined\b/i.test(line) &&
      !/^(follow|message|edit profile)$/i.test(line)
  );
  const bio = bioCandidates.join(" ").slice(0, 600);

  return {
    raw: text,
    displayName,
    handle,
    bio,
    hasLink: LINK_PATTERN.test(bio) || lines.some((line) => LINK_PATTERN.test(line)),
    followers,
    hasPinnedPost: /\bpinned\b/i.test(text),
  };
}

function buildChecks(parsed: Parsed): RankCheck[] {
  // handle and followers are carried into `observed` for auditability but are
  // deliberately not scored: follower count is a vanity metric, and the product
  // says so in its own copy.
  const { displayName, bio, hasLink, hasPinnedPost } = parsed;
  const bioLength = bio.trim().length;

  return [
    // Positioning
    check({
      id: "x-name-present",
      pillar: "positioning",
      label: "Display name is more than a handle",
      status: displayName.length >= 3 ? "pass" : "fail",
      weight: 0.2,
      evidence: displayName
        ? `Your display name reads "${displayName}".`
        : "No display name found in what you pasted, so you show up as just a handle.",
      fix: "Use your real name, and add the one word that says what you do. It is the first thing a stranger reads.",
      effort: "S",
    }),
    check({
      id: "x-bio-present",
      pillar: "positioning",
      label: "Bio uses the space available",
      status: bioLength >= 100 ? "pass" : bioLength > 0 ? "warn" : "fail",
      weight: 0.4,
      evidence: bioLength
        ? `Your bio is about ${bioLength} characters of the ${BIO_LIMIT} X allows.`
        : "No bio found in what you pasted.",
      fix: `You get ${BIO_LIMIT} characters and they are the only thing between a profile visit and a follow. Use most of them.`,
      effort: "S",
    }),
    check({
      id: "x-bio-audience",
      pillar: "positioning",
      label: "Bio names who you are for",
      status: AUDIENCE_MARKERS.test(bio) ? "pass" : "fail",
      weight: 0.4,
      evidence: AUDIENCE_MARKERS.test(bio)
        ? "Your bio says who you are for."
        : "Your bio describes you but never says who it is for.",
      fix: 'Name the audience directly, as in "for solo founders" or "helping indie hackers ship", so a stranger knows in one line whether this is for them.',
      effort: "S",
    }),

    // Proof
    check({
      id: "x-bio-outcome",
      pillar: "proof",
      label: "Bio names what you actually do",
      status: BUILDING_MARKERS.test(bio) || OUTCOME_MARKERS.test(bio) ? "pass" : "warn",
      weight: 0.35,
      evidence:
        BUILDING_MARKERS.test(bio) || OUTCOME_MARKERS.test(bio)
          ? "Your bio names concrete work."
          : "Your bio lists roles or interests rather than what you are doing right now.",
      fix: "Say what you are building or writing about currently. Present tense beats a list of titles.",
      effort: "S",
    }),
    check({
      id: "x-bio-specifics",
      pillar: "proof",
      label: "Bio carries a specific",
      status: METRIC_PATTERN.test(bio) ? "pass" : "warn",
      weight: 0.35,
      evidence: METRIC_PATTERN.test(bio)
        ? "Your bio includes a number a reader can hold onto."
        : "Your bio has no numbers in it, so every claim reads as an adjective.",
      fix: "Add one true specific: revenue, users, years, or shipped count. One number does more than three adjectives.",
      effort: "S",
    }),
    check({
      id: "x-pinned-post",
      pillar: "proof",
      label: "A post is pinned",
      status: hasPinnedPost ? "pass" : "warn",
      weight: 0.3,
      evidence: hasPinnedPost
        ? "You have a pinned post."
        : "No pinned post detected. The top of your profile is whatever you happened to say last.",
      fix: "Pin your best post, ideally one that explains what you are building and links to it.",
      effort: "S",
    }),

    // Cadence and engagement are not visible in a profile paste.
    check({
      id: "x-cadence-unknown",
      pillar: "cadence",
      label: "Posting cadence",
      status: "unknown",
      weight: 1,
      evidence:
        "Cadence cannot be read from a pasted profile. Connect your X account in FollowerSpike to track it over time.",
      fix: "",
      effort: "M",
    }),
    check({
      id: "x-engagement-unknown",
      pillar: "engagement",
      label: "Reply and conversation depth",
      status: "unknown",
      weight: 1,
      evidence:
        "Engagement cannot be read from a pasted profile. Connect your X account in FollowerSpike to track it over time.",
      fix: "",
      effort: "M",
    }),

    // Conversion
    check({
      id: "x-link-present",
      pillar: "conversion",
      label: "There is somewhere to go next",
      status: hasLink ? "pass" : "fail",
      weight: 0.6,
      evidence: hasLink
        ? "Your profile has a link on it."
        : "No link found. A reader who is convinced has nowhere to go.",
      fix: "Put one link in your bio: the product, or a page that captures an email.",
      effort: "S",
    }),
    check({
      id: "x-cta-present",
      pillar: "conversion",
      label: "The bio says what to do next",
      status: CTA_MARKERS.test(bio) ? "pass" : "warn",
      weight: 0.4,
      evidence: CTA_MARKERS.test(bio)
        ? "Your bio includes a call to action."
        : "Your bio explains who you are but never says what to do about it.",
      fix: "End the bio with one instruction, such as the name of the thing behind the link and who it is for.",
      effort: "S",
    }),
  ];
}

export function rankXProfile(pastedProfile: string, displayHandle?: string): RankResult {
  const parsed = parsePastedXProfile(pastedProfile);
  const checks = buildChecks(parsed);
  const handle = displayHandle || (parsed.handle ? `@${parsed.handle}` : "Your X profile");

  return scoreChecks("x", handle, checks, {
    charactersPasted: parsed.raw.length,
    displayNameDetected: Boolean(parsed.displayName),
    bioCharacters: parsed.bio.trim().length,
    followers: parsed.followers,
    hasLink: parsed.hasLink,
    hasPinnedPost: parsed.hasPinnedPost,
  });
}
