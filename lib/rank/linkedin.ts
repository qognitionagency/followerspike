import { check, scoreChecks } from "@/lib/rank/score";
import type { RankCheck, RankResult } from "@/lib/rank/types";

/**
 * LinkedIn Spike Rank scores text the member pastes in themselves.
 *
 * LinkedIn's API does not expose a member's headline, About, or experience to
 * third-party apps -- those are Basic/Full Profile fields, restricted to
 * approved Partner Program applications -- so there is no API path to this data
 * and scraping the public page is against LinkedIn's terms. The member pastes
 * their own profile instead.
 *
 * Cadence and engagement cannot be read from a profile paste, so their checks
 * report "unknown" and are excluded from the score rather than counted as
 * failures.
 */

const AUDIENCE_MARKERS = /\b(for|helping|help|i help|we help|so that|who want|serving)\b/i;
const OUTCOME_MARKERS = /\b(grow|growth|revenue|reduce|save|increase|launch|scale|ship|hire|raise|convert|build)\b/i;
const METRIC_PATTERN = /(\$\s?\d|\d+\s?%|\b\d[\d,.]*\s?(k|m|x|mrr|arr|users?|customers?|clients?|founders?|companies|teams|years?)\b)/i;
const LINK_PATTERN = /(https?:\/\/\S+|\b[a-z0-9-]+\.(com|io|co|dev|ai|app|xyz|net|org)\b)/i;
const CTA_MARKERS = /\b(dm me|message me|book a|get in touch|reach out|email me|subscribe|newsletter|sign up|free)\b/i;
const GENERIC_TITLE = /^(founder|ceo|co-?founder|entrepreneur|consultant|coach|developer|engineer|manager|director)[\s|,.-]*$/i;

type Parsed = {
  raw: string;
  headline: string;
  about: string;
  hasAboutSection: boolean;
  hasExperienceSection: boolean;
  hasFeaturedSection: boolean;
};

/**
 * A pasted profile has no reliable structure, so sections are located by their
 * headings and the headline is taken as the first substantive line.
 */
export function parsePastedProfile(raw: string): Parsed {
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sectionAt = (name: string) =>
    lines.findIndex((line) => new RegExp(`^${name}\\b`, "i").test(line) && line.length <= name.length + 12);

  const aboutIndex = sectionAt("About");
  const experienceIndex = sectionAt("Experience");
  const featuredIndex = sectionAt("Featured");

  // The first line is usually the member's name; the headline follows it.
  const headline = lines.slice(0, 4).find((line) => line.length > 15 && !/^\d+(st|nd|rd|th)\b/i.test(line)) ?? lines[1] ?? "";

  let about = "";
  if (aboutIndex >= 0) {
    const end = [experienceIndex, featuredIndex].filter((index) => index > aboutIndex).sort((a, b) => a - b)[0] ?? lines.length;
    about = lines.slice(aboutIndex + 1, end).join(" ");
  }

  return {
    raw: text,
    headline,
    about,
    hasAboutSection: aboutIndex >= 0,
    hasExperienceSection: experienceIndex >= 0,
    hasFeaturedSection: featuredIndex >= 0,
  };
}

function buildChecks(parsed: Parsed): RankCheck[] {
  const { headline, about, raw } = parsed;
  const aboutLength = about.trim().length;
  const searchable = `${headline} ${about}`;

  return [
    // Positioning
    check({
      id: "headline-present",
      pillar: "positioning",
      label: "Headline is more than a job title",
      status: headline.length >= 40 && !GENERIC_TITLE.test(headline) ? "pass" : headline.length > 0 ? "warn" : "fail",
      weight: 0.35,
      evidence: headline ? `Your headline reads: "${headline.slice(0, 120)}"` : "No headline detected in what you pasted.",
      fix: "Your headline is the most-read line on LinkedIn. Use it to say who you help and what changes, not just your title.",
      effort: "S",
    }),
    check({
      id: "headline-audience",
      pillar: "positioning",
      label: "Headline names your audience",
      status: AUDIENCE_MARKERS.test(headline) ? "pass" : "fail",
      weight: 0.35,
      evidence: AUDIENCE_MARKERS.test(headline)
        ? "Your headline names who you are for."
        : "Your headline does not say who you are for.",
      fix: 'Add the audience directly — "helping B2B founders…", "for early-stage SaaS teams…".',
      effort: "S",
    }),
    check({
      id: "headline-outcome",
      pillar: "positioning",
      label: "Headline names an outcome",
      status: OUTCOME_MARKERS.test(headline) ? "pass" : "warn",
      weight: 0.3,
      evidence: OUTCOME_MARKERS.test(headline)
        ? "Your headline points at a result."
        : "Your headline describes a role but not a result.",
      fix: "Name what changes for the people you help, not the service you perform.",
      effort: "S",
    }),

    // Proof
    check({
      id: "about-present",
      pillar: "proof",
      label: "About section is written",
      status: aboutLength >= 400 ? "pass" : aboutLength > 0 ? "warn" : "fail",
      weight: 0.35,
      evidence: aboutLength
        ? `Your About section is about ${aboutLength} characters.`
        : "No About section found in what you pasted.",
      fix: "Write 3–4 short paragraphs: who you help, how, what proof you have, and what to do next.",
      effort: "M",
    }),
    check({
      id: "metrics-named",
      pillar: "proof",
      label: "Real numbers appear in your profile",
      status: METRIC_PATTERN.test(searchable) ? "pass" : "fail",
      weight: 0.35,
      evidence: METRIC_PATTERN.test(searchable)
        ? "Your profile cites specific numbers."
        : "No concrete numbers appear in your headline or About section.",
      fix: "Add the specifics you already have — revenue, customers served, years, team size. Numbers do the persuading that adjectives cannot.",
      effort: "S",
    }),
    check({
      id: "experience-present",
      pillar: "proof",
      label: "Experience section is filled in",
      status: parsed.hasExperienceSection ? "pass" : "unknown",
      weight: 0.15,
      evidence: parsed.hasExperienceSection
        ? "An Experience section is present."
        : "No Experience section in the pasted text — paste more of your profile to score this.",
      fix: "Include your current role with a description that repeats your positioning.",
      effort: "M",
    }),
    check({
      id: "featured-present",
      pillar: "proof",
      label: "Featured section is in use",
      status: parsed.hasFeaturedSection ? "pass" : "warn",
      weight: 0.15,
      evidence: parsed.hasFeaturedSection ? "You use the Featured section." : "No Featured section detected.",
      fix: "Featured sits high on the profile and accepts links. Put your product or best post there.",
      effort: "S",
    }),

    // Cadence and engagement are not knowable from a profile paste.
    check({
      id: "cadence-unknown",
      pillar: "cadence",
      label: "Posting cadence",
      status: "unknown",
      weight: 1,
      evidence: "Posting cadence cannot be read from a pasted profile, so it is excluded from this score.",
      fix: "Connect your LinkedIn account to score cadence and engagement.",
      effort: "S",
    }),
    check({
      id: "engagement-unknown",
      pillar: "engagement",
      label: "Engagement quality",
      status: "unknown",
      weight: 1,
      evidence: "Engagement cannot be read from a pasted profile, so it is excluded from this score.",
      fix: "Connect your LinkedIn account to score cadence and engagement.",
      effort: "S",
    }),

    // Conversion
    check({
      id: "link-present",
      pillar: "conversion",
      label: "Your profile links somewhere",
      status: LINK_PATTERN.test(raw) ? "pass" : "fail",
      weight: 0.6,
      evidence: LINK_PATTERN.test(raw)
        ? "Your profile contains a link."
        : "No link found, so an interested reader has nowhere to go.",
      fix: "Put a link in your Featured section and in the website field — the product, or a page that captures an email.",
      effort: "S",
    }),
    check({
      id: "cta-present",
      pillar: "conversion",
      label: "You tell people what to do next",
      status: CTA_MARKERS.test(searchable) ? "pass" : "warn",
      weight: 0.4,
      evidence: CTA_MARKERS.test(searchable)
        ? "Your profile includes a call to action."
        : "Your profile explains who you are but never says what to do next.",
      fix: 'End your About section with one specific instruction — "DM me the word AUDIT and I will send the checklist."',
      effort: "S",
    }),
  ];
}

export function rankLinkedInProfile(pastedProfile: string, displayHandle = "Your LinkedIn profile"): RankResult {
  const parsed = parsePastedProfile(pastedProfile);
  const checks = buildChecks(parsed);

  return scoreChecks("linkedin", displayHandle, checks, {
    charactersPasted: parsed.raw.length,
    headlineDetected: Boolean(parsed.headline),
    aboutCharacters: parsed.about.trim().length,
    hasExperienceSection: parsed.hasExperienceSection,
    hasFeaturedSection: parsed.hasFeaturedSection,
  });
}
