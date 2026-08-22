import { getAuthorFeed, getProfile, type BlueskyPost, type BlueskyProfile } from "@/lib/platforms/bluesky";
import { check, scoreChecks } from "@/lib/rank/score";
import type { RankCheck, RankResult } from "@/lib/rank/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Phrases that describe a job title but not who the account is for. */
const AUDIENCE_MARKERS = /\b(for|helping|help|i help|we help|building for|serving)\b/i;
const LINK_PATTERN = /https?:\/\/\S+/i;
const DEFAULT_HANDLE_SUFFIX = /\.bsky\.social$/i;

function daysBetween(a: number, b: number): number {
  return Math.abs(a - b) / DAY_MS;
}

function postsPerWeek(posts: BlueskyPost[]): number {
  if (posts.length < 2) return posts.length;
  const times = posts.map((post) => new Date(post.createdAt).getTime()).sort((a, b) => b - a);
  const span = Math.max(daysBetween(times[0], times[times.length - 1]), 1);
  return (posts.length / span) * 7;
}

function medianGapDays(posts: BlueskyPost[]): number {
  if (posts.length < 3) return 0;
  const times = posts.map((post) => new Date(post.createdAt).getTime()).sort((a, b) => b - a);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i += 1) gaps.push(daysBetween(times[i - 1], times[i]));
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** Sub-day gaps read as "0.0 days", which is useless to a reader. */
function humanGap(days: number): string {
  if (days >= 1) return `${days.toFixed(1)} days`;
  const hours = days * 24;
  if (hours >= 1) return `${Math.round(hours)} hours`;
  return `${Math.max(Math.round(hours * 60), 1)} minutes`;
}

function buildChecks(profile: BlueskyProfile, posts: BlueskyPost[]): RankCheck[] {
  const originals = posts.filter((post) => !post.isReply);
  const replies = posts.filter((post) => post.isReply);
  const description = profile.description ?? "";
  // Cadence is about what you publish, so replies are excluded here. Replies are
  // scored separately under engagement, where they are a positive signal.
  const perWeek = postsPerWeek(originals);
  const gap = medianGapDays(originals);
  const newest = posts.length ? new Date(posts[0].createdAt).getTime() : 0;
  const daysSinceLastPost = newest ? daysBetween(Date.now(), newest) : Infinity;
  const engagementPerOriginal = originals.length
    ? originals.reduce((sum, post) => sum + post.likeCount + post.repostCount + post.replyCount, 0) / originals.length
    : 0;

  return [
    // Positioning
    check({
      id: "display-name",
      pillar: "positioning",
      label: "Display name is set",
      status: profile.displayName && profile.displayName.trim().length > 1 ? "pass" : "fail",
      weight: 0.15,
      evidence: profile.displayName ? `Display name is "${profile.displayName}".` : "No display name, so you show up as just a handle.",
      fix: "Set a display name. Your real name works best if you are building a founder audience.",
      effort: "S",
    }),
    check({
      id: "description-present",
      pillar: "positioning",
      label: "Bio is written",
      status: description.trim().length >= 40 ? "pass" : description.trim().length > 0 ? "warn" : "fail",
      weight: 0.3,
      evidence: description.trim().length
        ? `Your bio is ${description.trim().length} characters.`
        : "Your bio is empty.",
      fix: "Write 2–3 lines: what you build, who it is for, and what someone gets by following you.",
      effort: "S",
    }),
    check({
      id: "description-audience",
      pillar: "positioning",
      label: "Bio names who you are for",
      status: AUDIENCE_MARKERS.test(description) ? "pass" : "fail",
      weight: 0.3,
      evidence: AUDIENCE_MARKERS.test(description)
        ? "Your bio names an audience."
        : "Your bio describes what you are, not who you are for.",
      fix: 'Add the audience explicitly, as in "for solo founders" or "helping indie hackers ship", so a stranger knows in one line whether this is for them.',
      effort: "S",
    }),
    check({
      id: "custom-handle",
      pillar: "positioning",
      label: "Handle uses your own domain",
      status: DEFAULT_HANDLE_SUFFIX.test(profile.handle) ? "warn" : "pass",
      weight: 0.25,
      evidence: DEFAULT_HANDLE_SUFFIX.test(profile.handle)
        ? `You are on the default handle ${profile.handle}.`
        : `Your handle is your own domain: ${profile.handle}.`,
      fix: "Set your domain as your handle. It is free, takes one DNS record, and is the strongest credibility signal Bluesky has.",
      effort: "M",
    }),

    // Proof
    check({
      id: "avatar",
      pillar: "proof",
      label: "Profile picture is set",
      status: profile.avatar ? "pass" : "fail",
      weight: 0.3,
      evidence: profile.avatar ? "You have a profile picture." : "No profile picture.",
      fix: "Upload a clear photo of your face. Logos underperform for founder accounts.",
      effort: "S",
    }),
    check({
      id: "banner",
      pillar: "proof",
      label: "Banner is set",
      status: profile.banner ? "pass" : "fail",
      weight: 0.2,
      evidence: profile.banner ? "You have a banner image." : "No banner, so the top of your profile is empty space.",
      fix: "Add a banner showing the product or a one-line statement of what you do.",
      effort: "S",
    }),
    check({
      id: "pinned-post",
      pillar: "proof",
      label: "A post is pinned",
      status: profile.hasPinnedPost ? "pass" : "fail",
      weight: 0.3,
      evidence: profile.hasPinnedPost ? "You have a pinned post." : "Nothing is pinned, so new visitors land on whatever you posted last.",
      fix: "Pin your best post, ideally one that explains what you are building and links to it.",
      effort: "S",
    }),
    check({
      id: "verified",
      pillar: "proof",
      label: "Account is verified",
      status: profile.isVerified ? "pass" : "warn",
      weight: 0.2,
      evidence: profile.isVerified ? "Your account carries verification." : "Not verified.",
      fix: "Using your own domain as your handle is the practical substitute and carries most of the same trust.",
      effort: "M",
    }),

    // Cadence
    check({
      id: "posting-frequency",
      pillar: "cadence",
      label: "Posting at least three times a week",
      status: perWeek >= 3 ? "pass" : perWeek >= 1 ? "warn" : "fail",
      weight: 0.4,
      evidence: `You publish about ${perWeek.toFixed(1)} original posts a week, not counting replies.`,
      fix: "Get to three posts a week. Consistency matters more than volume for follower growth.",
      effort: "M",
    }),
    check({
      id: "recency",
      pillar: "cadence",
      label: "Posted in the last week",
      status: daysSinceLastPost <= 7 ? "pass" : daysSinceLastPost <= 21 ? "warn" : "fail",
      weight: 0.3,
      evidence: Number.isFinite(daysSinceLastPost)
        ? `Your last post was ${Math.round(daysSinceLastPost)} days ago.`
        : "No posts found.",
      fix: "Post something this week. Dormant accounts stop being shown to people who follow them.",
      effort: "S",
    }),
    check({
      id: "consistency",
      pillar: "cadence",
      label: "Posting rhythm is even",
      status: gap ? (gap <= 3 ? "pass" : gap <= 7 ? "warn" : "fail") : "unknown",
      weight: 0.3,
      evidence: gap
        ? `Your typical gap between original posts is about ${humanGap(gap)}.`
        : "Not enough original posts to measure a rhythm.",
      fix: "Batch-write and schedule. Bursts followed by silence perform worse than a steady cadence.",
      effort: "M",
    }),

    // Engagement
    check({
      id: "reply-ratio",
      pillar: "engagement",
      label: "You reply to other people",
      status: (() => {
        if (!posts.length) return "unknown";
        const ratio = replies.length / posts.length;
        return ratio >= 0.25 ? "pass" : ratio > 0.05 ? "warn" : "fail";
      })(),
      weight: 0.5,
      evidence: posts.length
        ? `${Math.round((replies.length / posts.length) * 100)}% of your recent activity is replies to other people.`
        : "No recent activity found.",
      fix: "Spend a quarter of your posting time replying in other people's threads. It is the fastest way to be discovered on Bluesky.",
      effort: "M",
    }),
    check({
      id: "engagement-per-post",
      pillar: "engagement",
      label: "Posts are getting responses",
      status: (() => {
        if (!originals.length) return "unknown";
        return engagementPerOriginal >= 5 ? "pass" : engagementPerOriginal >= 1 ? "warn" : "fail";
      })(),
      weight: 0.5,
      evidence: originals.length
        ? `Your original posts average ${engagementPerOriginal.toFixed(1)} likes, reposts, and replies combined.`
        : "No original posts found to measure.",
      fix: "Open with a specific claim or number rather than a general observation, and end somewhere a reader can answer.",
      effort: "M",
    }),

    // Conversion
    check({
      id: "bio-link",
      pillar: "conversion",
      label: "Bio contains a link",
      status: LINK_PATTERN.test(description) ? "pass" : "fail",
      weight: 0.5,
      evidence: LINK_PATTERN.test(description)
        ? "Your bio links somewhere."
        : "Your bio has no link, so there is nowhere for an interested reader to go.",
      fix: "Put one link in your bio: the product, or a page that captures an email.",
      effort: "S",
    }),
    check({
      id: "posts-with-links",
      pillar: "conversion",
      label: "Some posts lead somewhere",
      status: (() => {
        if (!originals.length) return "unknown";
        const withLinks = originals.filter((post) => post.hasExternalLink).length / originals.length;
        if (withLinks === 0) return "fail";
        return withLinks <= 0.3 ? "pass" : "warn";
      })(),
      weight: 0.5,
      evidence: originals.length
        ? `${Math.round((originals.filter((post) => post.hasExternalLink).length / originals.length) * 100)}% of your original posts include a link.`
        : "No original posts found to measure.",
      fix: "Aim for roughly one in five posts pointing somewhere. Zero converts nothing; every post converts nobody twice.",
      effort: "S",
    }),
  ];
}

export async function rankBlueskyProfile(handle: string): Promise<RankResult> {
  const [profile, posts] = await Promise.all([getProfile(handle), getAuthorFeed(handle, 40)]);
  const checks = buildChecks(profile, posts);

  return scoreChecks("bluesky", profile.handle, checks, {
    handle: profile.handle,
    displayName: profile.displayName,
    followers: profile.followersCount,
    following: profile.followsCount,
    totalPosts: profile.postsCount,
    postsAnalyzed: posts.length,
    hasBanner: Boolean(profile.banner),
    hasPinnedPost: profile.hasPinnedPost,
  });
}
