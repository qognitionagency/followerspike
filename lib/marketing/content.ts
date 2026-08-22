import {
  BrainCircuit,
  CalendarDays,
  FileSearch,
  Gauge,
  Layers3,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
} from "@/components/icons";
import { INDUSTRIES, ROLES } from "@/lib/constants";



export type FeaturePage = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  highlights: string[];
  workflow: Array<{ title: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export type FreeToolDefinition = {
  slug: string;
  name: string;
  title: string;
  description: string;
  category: string;
  inputLabel: string;
  inputPlaceholder: string;
  contextLabel?: string;
  contextPlaceholder?: string;
  resultLabel: string;
  cta: string;
  icon: typeof Sparkles;
};

export type FreeToolSection = {
  title: string;
  body: string;
  items?: string[];
};

export type FreeToolResult = {
  title: string;
  score?: number;
  summary: string;
  sections: FreeToolSection[];
  cta: string;
  leadId?: string;
  /** Set for Spike Rank tools; identifies the stored history row for this run. */
  snapshotId?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  sections: Array<{ heading: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export type AudiencePage = {
  slug: string;
  type: "role" | "industry" | "icp";
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  pain: string;
  workflow: string[];
  features: string[];
  faq: Array<{ question: string; answer: string }>;
};

export type ComparisonPage = {
  slug: string;
  title: string;
  description: string;
  competitor: string;
  rows: Array<{ capability: string; followerSpike: string; alternative: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export function slugifyMarketing(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const featurePages: FeaturePage[] = [
  {
    slug: "multi-platform-composer",
    eyebrow: "Composer",
    title: "Write once. Publish native to X, LinkedIn, and Bluesky.",
    description:
      "One editor with a live preview per platform, so a thread reads like a thread and a LinkedIn post reads like LinkedIn rather than like a repost.",
    icon: Layers3,
    highlights: ["Per-platform previews", "Thread builder", "Link preview control", "Drafts"],
    workflow: [
      { title: "Write it once", body: "Draft in a single editor while FollowerSpike tracks each platform's limits: 280 characters on X, 300 on Bluesky, 3,000 on LinkedIn." },
      { title: "See it as they will", body: "Previews render the real thing: thread splits, truncation points, and where a link preview will appear." },
      { title: "Adapt, do not duplicate", body: "Rewrite for each platform in one click instead of pasting identical text into three boxes." },
    ],
    faq: [
      { question: "Do I have to post the same thing everywhere?", answer: "No. Each platform keeps its own version, and you can edit any of them before it goes out." },
      { question: "Are threads supported?", answer: "Yes, on both X and Bluesky, including publishing thread items on a delay." },
    ],
  },
  {
    slug: "voice-engine",
    eyebrow: "Voice",
    title: "AI that writes like you, even before you have posts.",
    description:
      "Answer eight questions, or clone the voice out of the posts you already wrote. Both produce the same thing: a versioned voice profile, with a per-platform override where you want one.",
    icon: BrainCircuit,
    highlights: ["Voice Interview", "Voice Cloner", "Versioned profiles", "Per-platform overrides"],
    workflow: [
      { title: "Start from anywhere", body: "No posts yet? Take the Voice Interview. Already posting? Clone the voice from your best existing posts." },
      { title: "Answer by ear, not by theory", body: "The interview shows you the same idea written two ways and asks which sounds more like you. Nobody has to describe their own tone." },
      { title: "Keep the corrections", body: "Every edit you make to a draft is stored against the profile version it came from, so the record of how you actually write stays in one place." },
    ],
    faq: [
      { question: "What if I have never posted?", answer: "That is what the Voice Interview is for. Eight questions build a usable voice profile with no post history at all." },
      { question: "Does it invent metrics about my company?", answer: "No. The profile stores the real numbers and milestones you give it, and drafts are held to those." },
    ],
  },
  {
    slug: "spike-rank",
    eyebrow: "Spike Rank",
    title: "Score your profile, then fix what is costing you followers.",
    description:
      "A 0 to 100 score for each of your X, LinkedIn, and Bluesky profiles across positioning, proof, cadence, engagement, and conversion path.",
    icon: Gauge,
    highlights: ["Per-platform score", "Ranked fix list", "Score history", "Rewrites included"],
    workflow: [
      { title: "Get ranked", body: "Five weighted pillars, each with checks that pass, warn, or fail, and a reason for every one." },
      { title: "See the five that matter", body: "Fixes are ordered by impact against effort, so you know what to do this week rather than someday." },
      { title: "Fix it in the product", body: "Every finding comes with a rewrite you can apply, and the content ideas land straight in your queue." },
    ],
    faq: [
      { question: "How do you read my LinkedIn profile?", answer: "You paste it. LinkedIn does not give third-party apps access to your headline, About, or experience, so we ask for it directly rather than scraping." },
      { question: "Does the score change on its own?", answer: "Bluesky is rescored on a schedule. X and LinkedIn are scored when you run them, and the history shows what moved after each fix." },
    ],
  },
  {
    slug: "growth-automations",
    eyebrow: "Automations",
    title: "The posting chores, handled by rule.",
    description:
      "Auto-plug a strong post, drop the link in the first comment, recycle evergreen work, and relay an X thread to LinkedIn, all through official APIs.",
    icon: CalendarDays,
    highlights: ["Auto-Plug", "First Comment", "Evergreen recycling", "Cross-post relay"],
    workflow: [
      { title: "Set the rule", body: "Each automation is a plain trigger and action: four hours after this post goes live, reply to it with the link." },
      { title: "Stay inside the caps", body: "Daily limits, quiet hours in your timezone, and duplicate suppression are enforced before anything fires." },
      { title: "Check the log", body: "Every firing is recorded, including the ones a cap or quiet-hour rule blocked, so nothing happens invisibly." },
    ],
    faq: [
      { question: "Will this get my account restricted?", answer: "Every automation runs through the platform's official API under permissions you granted. FollowerSpike does not drive your account through a browser and does not scrape." },
      { question: "Can I try one without it going live?", answer: "Yes. Dry-run mode shows exactly what would have happened and makes no external calls." },
    ],
  },
  {
    slug: "lead-capture",
    eyebrow: "Lead capture",
    title: "Turn a good post into email subscribers.",
    description:
      "When someone replies to your post with your keyword and an email address, the resource is emailed there. No direct messages, on any platform.",
    icon: Send,
    highlights: ["Keyword opt-in", "Email delivery", "Saved lead list", "Daily caps"],
    workflow: [
      { title: "Pick the keyword", body: "Ask for a reply with the keyword and an email address. The reply is the opt-in, so nobody hears from you uninvited." },
      { title: "Deliver by email", body: "FollowerSpike reads the replies under your own post and emails the resource to the address in the reply, capped per day and never twice to the same address." },
      { title: "Keep the lead", body: "Every capture is saved with the handle, the platform, and the address it went to, ready for a sequence you run in your own email tool." },
    ],
    faq: [
      { question: "Do you send DMs?", answer: "No. FollowerSpike does not send direct messages on X, LinkedIn, or Bluesky. Capture reads replies on your own posts and delivers by email only." },
      { question: "Can someone opt out?", answer: "Yes. An address that unsubscribes is recorded as such and is never emailed again." },
    ],
  },
  {
    slug: "safety-controls",
    eyebrow: "Safety",
    title: "Official APIs, hard caps, and a log of everything.",
    description:
      "FollowerSpike reads and publishes only through each platform's own API, under permissions you grant and can revoke.",
    icon: ShieldCheck,
    highlights: ["API-only access", "Daily caps", "Quiet hours", "Full activity log"],
    workflow: [
      { title: "Connect the account", body: "You authorize each account through the platform itself, with an app password on Bluesky, and the credential is stored encrypted and can be revoked from the platform at any time." },
      { title: "Set your ceilings", body: "Daily caps and quiet hours are yours to set, and they are enforced in code before any call is made." },
      { title: "Stop anything instantly", body: "One switch disables an automation, and another disables all of them across every account." },
    ],
    faq: [
      { question: "Is FollowerSpike affiliated with these platforms?", answer: "No. FollowerSpike is independent and claims no endorsement from X, LinkedIn, or Bluesky." },
      { question: "Do you automate likes, follows, or connection requests?", answer: "No. Those carry real account risk and are deliberately not part of the product." },
    ],
  },
];

export const freeTools: FreeToolDefinition[] = [
  {
    slug: "spike-rank-x",
    name: "X Profile Score",
    title: "Score your X profile out of 100.",
    description: "Display name, bio, pinned post, and whether anything on your profile leads anywhere. Paste your profile, because X exposes no public profile data to read it for you.",
    category: "Spike Rank",
    inputLabel: "Your X profile",
    inputPlaceholder: "Open your profile, select all, and paste it here: name, handle, bio, and pinned post.",
    contextLabel: "What are you growing toward?",
    contextPlaceholder: "Customers, investors, hiring, an audience for a launch...",
    resultLabel: "X profile score",
    cta: "Fix the top five in FollowerSpike",
    icon: Gauge,
  },
  {
    slug: "spike-rank-bluesky",
    name: "Bluesky Profile Score",
    title: "Score your Bluesky profile out of 100.",
    description: "Handle, banner, description, posting rhythm, and conversation depth, read live from your public profile.",
    category: "Spike Rank",
    inputLabel: "Your Bluesky handle",
    inputPlaceholder: "yourname.bsky.social",
    contextLabel: "What are you growing toward?",
    contextPlaceholder: "Customers, investors, hiring, an audience for a launch...",
    resultLabel: "Bluesky profile score",
    cta: "Apply the fixes in one click",
    icon: Sparkles,
  },
  {
    slug: "spike-rank-linkedin",
    name: "LinkedIn Profile Score",
    title: "Score your LinkedIn profile out of 100.",
    description: "Paste your profile and get positioning, proof, and conversion gaps with a rewritten headline and About.",
    category: "Spike Rank",
    inputLabel: "Paste your LinkedIn profile",
    inputPlaceholder: "Open your profile, select all, and paste it here: headline, About, and experience.",
    contextLabel: "What are you growing toward?",
    contextPlaceholder: "Inbound leads, hiring, investor visibility...",
    resultLabel: "LinkedIn profile score",
    cta: "Turn this audit into a 30-day plan",
    icon: FileSearch,
  },
  {
    slug: "founder-voice-finder",
    name: "Founder Voice Finder",
    title: "Find your writing voice without writing anything.",
    description: "Answer a few questions and get a voice profile: your cadence, your hooks, and the words you should never let AI put in your mouth.",
    category: "Voice",
    inputLabel: "What do you build, in one sentence you would actually say out loud?",
    inputPlaceholder: "We help solo founders get their first 1,000 email subscribers from social.",
    contextLabel: "Name three accounts whose writing you would be happy to be compared to",
    contextPlaceholder: "@patio11, @shl, @jasonfried...",
    resultLabel: "Your voice profile",
    cta: "Write every post in this voice",
    icon: BrainCircuit,
  },
  {
    slug: "thread-splitter",
    name: "Thread Splitter",
    title: "Turn a long draft into a thread that reads well.",
    description: "Split any text into X or Bluesky posts on sentence boundaries, with a hook that earns the second post.",
    category: "Composer",
    inputLabel: "Your draft",
    inputPlaceholder: "Paste the long version. Notes, a blog section, a voice memo transcript...",
    contextLabel: "Platform",
    contextPlaceholder: "X, Bluesky, or both",
    resultLabel: "Your thread",
    cta: "Schedule this thread",
    icon: Layers3,
  },
  {
    slug: "cross-post-rewriter",
    name: "Cross-Post Rewriter",
    title: "Rewrite one post for all three platforms.",
    description: "The same idea as a tight X post, a Bluesky post, and a LinkedIn post, adapted rather than copy-pasted.",
    category: "Composer",
    inputLabel: "Your post",
    inputPlaceholder: "Paste what you already wrote for one platform...",
    contextLabel: "Where did this start?",
    contextPlaceholder: "X, LinkedIn, or Bluesky",
    resultLabel: "Three versions",
    cta: "Publish all three from one editor",
    icon: PenLine,
  },
  {
    slug: "hook-analyzer",
    name: "Hook Analyzer",
    title: "Find out whether your first line earns the second.",
    description: "The opening line decides whether anything else gets read. Score yours and get five sharper versions.",
    category: "Content",
    inputLabel: "Your opening line",
    inputPlaceholder: "We just hit $10k MRR...",
    contextLabel: "Who is it for?",
    contextPlaceholder: "Other founders, potential customers, investors...",
    resultLabel: "Hook score",
    cta: "Draft with better hooks by default",
    icon: Target,
  },
  {
    slug: "founder-bio-generator",
    name: "Founder Bio Generator",
    title: "Write your bio for X, LinkedIn, and Bluesky at once.",
    description: "One positioning statement, three native versions, inside each platform's limits and conventions.",
    category: "Profile",
    inputLabel: "What do you do and who for?",
    inputPlaceholder: "I build FollowerSpike, a posting tool for solo founders...",
    contextLabel: "Proof worth naming",
    contextPlaceholder: "Revenue, customers, a past company, something you shipped...",
    resultLabel: "Three bios",
    cta: "Apply these to your profiles",
    icon: UserRoundCheck,
  },
  {
    slug: "lead-magnet-post-writer",
    name: "Lead Magnet Post Writer",
    title: "Write the post that turns comments into subscribers.",
    description: "A keyword opt-in post plus the email it triggers, written so it reads like a person and not a funnel.",
    category: "Lead capture",
    inputLabel: "What are you giving away?",
    inputPlaceholder: "A Notion template, a teardown, a spreadsheet, a checklist...",
    contextLabel: "Who should want it?",
    contextPlaceholder: "Solo founders, indie hackers, agency owners...",
    resultLabel: "Post and email",
    cta: "Automate the delivery",
    icon: Send,
  },
  {
    slug: "founder-content-calendar",
    name: "Founder Content Calendar",
    title: "Plan a week of posts across all three platforms.",
    description: "Seven angles built from what you are actually building, mapped to the platform each one belongs on.",
    category: "Content",
    inputLabel: "What are you working on right now?",
    inputPlaceholder: "Shipping a redesign, hiring the first engineer, hit a revenue milestone...",
    contextLabel: "Audience",
    contextPlaceholder: "Who should this week speak to?",
    resultLabel: "7-day plan",
    cta: "Load this week into your queue",
    icon: CalendarDays,
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "linkedin-autopilot-for-founders",
    title: "LinkedIn Autopilot for Founders: What to Automate and What to Keep Human",
    description: "A practical guide to using a review-first publishing assistant without losing judgment or voice.",
    category: "Autopilot",
    date: "2026-05-16",
    readTime: "7 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "The founder problem", body: "Founders do not usually fail at LinkedIn because they lack ideas. They fail because the channel asks for small consistent actions on days that are already overloaded." },
      { heading: "The right automation boundary", body: "Drafting, scoring, queueing, reminding, and conservative execution can be assisted. Positioning, proof, sensitive replies, and relationship judgment still need the human owner." },
      { heading: "A loop that compounds", body: "One useful post, the link in the first comment rather than in the post, a plug on the one that landed, and a proven post back in the evergreen rotation is enough to create momentum without turning LinkedIn into a second job." },
    ],
    faq: [
      { question: "Should founders fully automate LinkedIn?", answer: "No. The safest approach is review-first, then conservative autopilot for low-risk actions after trust is built." },
    ],
  },
  {
    slug: "linkedin-automation-safety-and-consent",
    title: "LinkedIn Automation Safety: Consent, Limits, and Pause Controls",
    description: "How to think about platform risk without making growth feel scary or reckless.",
    category: "Trust",
    date: "2026-05-16",
    readTime: "6 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Risk is real", body: "Any platform automation can carry risk. FollowerSpike works only through each platform's official API, never a browser driving your account, and makes consent, limits, logs, and pause behavior visible instead of hiding them." },
      { heading: "Review-first by default", body: "New workflows should start with user approval until voice, targeting, and timing feel predictable." },
      { heading: "No shortcuts", body: "CAPTCHA bypass, ban evasion, fake pods, and mass scraping do not belong in a professional growth product." },
    ],
    faq: [
      { question: "Does FollowerSpike bypass platform checks?", answer: "No. It is designed to pause rather than bypass challenges." },
    ],
  },
  {
    slug: "build-linkedin-icp",
    title: "How to Build an ICP for LinkedIn Growth",
    description: "Turn a vague audience into specific roles, industries, pains, and topics.",
    category: "Strategy",
    date: "2026-05-16",
    readTime: "8 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Start narrower than feels comfortable", body: "A good LinkedIn ICP should name the person, the context, the pain, and the reason they should care now." },
      { heading: "Translate ICP into behavior", body: "Your ICP should decide what you post, which questions are worth answering in public, and which proof is worth repeating." },
      { heading: "Read what they read", body: "The accounts your buyers already follow tell you the vocabulary and the open questions of that market faster than a keyword list does." },
    ],
    faq: [
      { question: "Can I write for multiple ICPs?", answer: "Yes, but start with one primary audience per voice profile." },
    ],
  },
  {
    slug: "linkedin-comments-that-start-conversations",
    title: "LinkedIn Comments That Start Conversations",
    description: "A simple system for comments that are specific, useful, and not promotional.",
    category: "Engagement",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Add one useful layer", body: "The best comments add a distinction, example, question, or tactical next step." },
      { heading: "Avoid empty praise", body: "Generic compliments rarely create memory. Specific comments create recognition." },
      { heading: "Decide before you type", body: "If you cannot say in one line what the comment adds, skip it. Popular threads are not the same as threads your buyers read." },
    ],
    faq: [
      { question: "Should comments include a CTA?", answer: "Usually no. Comments should earn attention first. FollowerSpike only ever comments on your own posts, as a first comment or a plug, so comments on other people's posts stay yours to write." },
    ],
  },
  {
    slug: "connection-requests-that-do-not-feel-spammy",
    title: "Growing an Audience Without Sending a Single Request",
    description: "Why a publishing cadence and one clear next step build a following faster than outbound ever did.",
    category: "Audience",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Reach follows repetition", body: "People follow an account after they have seen it be useful more than once. That makes it a cadence problem rather than an outreach problem, and cadence is the part software can hold for you." },
      { heading: "Stay on one recognisable subject", body: "An account about one subject gets remembered for it. An account about six starts from zero every post, because nobody can predict what the next one will be about." },
      { heading: "Give the profile somewhere to go", body: "Spike Rank scores the conversion path as its own pillar for a reason. A bio with no link and a pinned post with no offer waste every visit the posts earn." },
    ],
    faq: [
      { question: "Does FollowerSpike send connection requests, follows, or likes?", answer: "No. It publishes your posts, comments on your own posts, and scores your profile. Nothing it does touches anyone else's account." },
    ],
  },
  {
    slug: "follow-up-dms-after-acceptance",
    title: "Turning Post Replies Into Email Subscribers",
    description: "How keyword capture works: someone asks for the resource under your post, leaves an address, and gets it by email.",
    category: "Lead capture",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Ask for a reply, not an inbox", body: "The post names a keyword. Anyone who wants the resource replies with it and leaves an email address, which makes the request itself the opt-in." },
      { heading: "Deliver by email", body: "FollowerSpike watches the replies under your own post and emails the resource to the address in the reply. There is no direct-message step, on any platform, and nobody who did not ask hears from you." },
      { heading: "Cap it, log it, and let people leave", body: "Delivery is capped per day, never repeats to the same address, honours an unsubscribe permanently, and every decision, including the ones a cap blocked, lands in the activity log." },
    ],
    faq: [
      { question: "Does FollowerSpike send DMs?", answer: "No. FollowerSpike does not send direct messages on any platform. Keyword capture delivers by email only." },
    ],
  },
  {
    slug: "daily-linkedin-routine-for-smb-owners",
    title: "A Daily LinkedIn Routine for SMB Owners",
    description: "A simple growth routine for business owners who cannot live inside LinkedIn.",
    category: "Routine",
    date: "2026-05-16",
    readTime: "6 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Use customer proof", body: "SMB owners often have stronger proof than they realize. Turn customer questions, objections, and outcomes into posts." },
      { heading: "Answer the question before it is asked", body: "The questions buyers put to you on the phone are the posts. Answering them in public means the next buyer arrives already convinced." },
      { heading: "Keep it repeatable", body: "A small daily queue beats an ambitious plan that disappears after three days." },
    ],
    faq: [
      { question: "Can SMB owners grow without posting daily?", answer: "Yes. Three useful posts a week on one subject beat a daily post you cannot sustain." },
    ],
  },
  {
    slug: "linkedin-growth-for-coaches",
    title: "LinkedIn Growth for Coaches",
    description: "How coaches can turn expertise into trust-building posts and relevant conversations.",
    category: "Audience",
    date: "2026-05-16",
    readTime: "6 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Teach the problem", body: "Coaches grow faster when they make the hidden problem visible before offering a solution." },
      { heading: "Use client-safe examples", body: "Share anonymized patterns, not private client details." },
      { heading: "Put the next step in the post", body: "A post that ends with somewhere to go, a reply keyword or the link in the first comment, lets an interested reader act without waiting to be contacted." },
    ],
    faq: [
      { question: "Should coaches use personal stories?", answer: "Yes, when the story serves a useful lesson for the audience." },
    ],
  },
  {
    slug: "linkedin-growth-for-consultants",
    title: "LinkedIn Growth for Consultants",
    description: "A practical visibility system for consultants who sell expertise and trust.",
    category: "Audience",
    date: "2026-05-16",
    readTime: "6 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Show your diagnostic lens", body: "Consultants should post the patterns they notice, not only the services they sell." },
      { heading: "Write where buying committees already read", body: "Consultants get found by people researching a problem, so the post has to name that problem in the words the buyer would use, not the words on your services page." },
      { heading: "Measure the path, not the follower count", body: "Followers matter only where they lead. Spike Rank scores the conversion path separately for that reason: the bio, the pinned post, and whether either one goes anywhere." },
    ],
    faq: [
      { question: "Is it safe to let this publish for me?", answer: "Everything is review-first by default. Automations ship off and in simulation mode, and you take them live one at a time once you have read the log." },
    ],
  },
  {
    slug: "ghostwriter-vs-agency-vs-autopilot",
    title: "Ghostwriter vs Agency vs LinkedIn Autopilot",
    description: "How to choose the right LinkedIn growth model for your budget, control, and execution needs.",
    category: "Comparison",
    date: "2026-05-16",
    readTime: "7 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Ghostwriters help with voice", body: "A ghostwriter can be useful for high-touch content, but the per-platform rewrite, the scheduling, and the first comment are usually still yours to run." },
      { heading: "Agencies add service", body: "Agencies can execute more broadly, but cost, control, and speed vary." },
      { heading: "Autopilot adds repeatability", body: "A review-first autopilot is best when you want software leverage and visible control." },
    ],
    faq: [
      { question: "Does FollowerSpike replace every agency?", answer: "No. It replaces the repetitive daily operating layer for many solo and small-team use cases." },
    ],
  },
  {
    slug: "linkedin-content-calendar-for-founders",
    title: "A LinkedIn Content Calendar for Founders",
    description: "Seven recurring post angles founders can use without becoming full-time creators.",
    category: "Content",
    date: "2026-05-16",
    readTime: "6 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Use the company as the source", body: "Customer calls, product decisions, hiring lessons, and market shifts are enough for a useful calendar." },
      { heading: "Rotate post types", body: "Use lessons, frameworks, contrarian takes, proof, founder notes, and questions." },
      { heading: "Connect content to action", body: "The best calendar also decides what goes in the first comment, which post is worth plugging a few hours later, and which one earns a place in the evergreen rotation." },
    ],
    faq: [
      { question: "How many posts should founders publish?", answer: "Start with three to five useful posts a week and increase only when the workflow is stable." },
    ],
  },
  {
    slug: "what-followerspike-automates",
    title: "What FollowerSpike Does and Does Not Automate",
    description: "A plain list of what the product does, and what it deliberately will not do.",
    category: "Product",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "What it helps with", body: "Drafting, a native variant per platform, scheduling and publishing through official APIs, the first comment on your own post, auto-plug, evergreen recycling, cross-post relay, keyword capture delivered by email, and the review queue and caps around all of it." },
      { heading: "What it avoids", body: "It sends no direct messages on any platform. It does not like, follow, or send connection requests, does not act on anyone else's posts, and does not drive your account through a browser. No CAPTCHA bypass, ban evasion, mass scraping, or engagement pods." },
      { heading: "Why boundaries matter", body: "Professional accounts need growth that compounds reputation instead of risking it for short-term activity." },
    ],
    faq: [
      { question: "Can I pause everything?", answer: "Yes. Pause controls and session deletion are part of the product." },
    ],
  },
];

const roleFocus: Record<string, string> = {
  Founder: "turn founder lessons, customer conversations, and market beliefs into a publishing rhythm across X, LinkedIn, and Bluesky",
  "Small Business Owner": "turn customer proof, local expertise, and daily operator lessons into trust",
  "Executive Coach": "share coaching insights without exposing private client context",
  Consultant: "show diagnostic thinking and attract decision-makers around a clear problem",
  "Content Creator": "publish once and land natively on every platform their audience already reads",
  "Agency Owner": "build authority while running several founder accounts out of one queue",
};

export function buildRolePages(): AudiencePage[] {
  return ROLES.map((role) => {
    const focus = roleFocus[role] ?? `build a sharper presence across X, LinkedIn, and Bluesky as a ${role}`;
    return {
      slug: slugifyMarketing(role),
      type: "role",
      name: role,
      eyebrow: "Role playbook",
      title: `Publishing system for ${role}s`,
      description: `FollowerSpike helps ${role}s ${focus}, with one composer for three platforms, a voice profile built from their own writing, Spike Rank, and a review queue in front of everything.`,
      pain: `${role}s need consistent visibility, but writing a post, adapting it per platform, and getting it scheduled falls behind client work and operations.`,
      workflow: ["Score the profile with Spike Rank", "Build a voice profile from the interview or your own posts", "Draft once and preview what each platform will publish", "Review the queue, then let the automations out of simulation"],
      features: ["Voice-aware drafts", "Per-platform previews", "First comment and auto-plug", "Review queue and daily caps"],
      faq: [
        { question: `Can ${role}s keep approval turned on?`, answer: "Yes. Review mode can stay on permanently." },
        { question: "Does this replace human judgment?", answer: "No. FollowerSpike drafts and schedules, and you approve. Nothing it does touches anyone else's account." },
      ],
    };
  });
}

export function buildIndustryPages(): AudiencePage[] {
  return INDUSTRIES.map((industry) => ({
    slug: slugifyMarketing(industry),
    type: "industry",
    name: industry,
    eyebrow: "Industry playbook",
    title: `Publishing system for ${industry}`,
    description: `FollowerSpike helps ${industry} professionals publish useful posts to X, LinkedIn, and Bluesky from one composer, in a voice modelled on their own writing.`,
    pain: `${industry} audiences are specific. Generic content posted at random rarely creates trust with the right people.`,
    workflow: ["Map the industry conversation", "Score the profile with Spike Rank", "Draft posts from real expertise", "Review the queue and publish to all three platforms"],
    features: ["Industry-specific topics", "Spike Rank profile scoring", "Native per-platform variants", "Safety and pause controls"],
    faq: [
      { question: `Can FollowerSpike adapt to ${industry}?`, answer: "Yes. The workflow starts with your niche, your audience, and a voice profile built from your own writing." },
      { question: "Will generated pages be thin?", answer: "No. Each industry page includes unique context, workflow, features, FAQs, and internal links." },
    ],
  }));
}

export const icpPages: AudiencePage[] = [
  ["founder-led-saas", "Founder-led SaaS", "reach operators, buyers, partners, and investors with clear founder-led positioning"],
  ["local-service-businesses", "Local service businesses", "turn local proof and operator expertise into a visible professional presence"],
  ["coaching-and-advisory", "Coaching and advisory", "attract clients through useful teaching and trust signals"],
  ["consulting-firms", "Consulting firms", "show diagnostic expertise where decision-makers already read"],
  ["creator-led-businesses", "Creator-led businesses", "publish once and land natively on every platform their audience uses"],
  ["agencies-and-studios", "Agencies and studios", "turn client work, frameworks, and market observations into authority"],
].map(([slug, name, focus]) => ({
  slug,
  type: "icp",
  name,
  eyebrow: "ICP playbook",
  title: `Publishing system for ${name}`,
  description: `FollowerSpike helps ${name} ${focus}.`,
  pain: `${name} need a consistent point of view published often enough to be remembered, not a feed full of generic posts.`,
  // Describes the product's actual sequence. The previous version named a
  // buying committee, seed leaders and an engagement queue — artefacts of the
  // retired automation engine, none of which exist in the software.
  workflow: ["Build a voice profile from posts you already wrote", "Draft once and preview what each platform will publish", "Queue the first comment and the plug with it", "Review the queue, then let the automations out of simulation"],
  features: ["Voice profile", "Multi-platform composer", "First comment and auto-plug", "Keyword capture with email delivery"],
  faq: [
    { question: "Can I change how it sounds later?", answer: "Yes. The voice profile is versioned, so you can revise it and see which version any draft was written against, and every edit you make to a generated draft is stored alongside it." },
    { question: "Does this create cold DM sequences?", answer: "No. Nothing here messages strangers. Capture only ever reads the replies under your own posts, and only emails someone who replied asking for something." },
  ],
}));

export const comparisonPages: ComparisonPage[] = [
  {
    slug: "ghostwriter-vs-linkedin-autopilot",
    title: "Ghostwriter vs FollowerSpike",
    description: "Compare high-touch writing help with software that adapts one post for three platforms and publishes it on a schedule.",
    competitor: "Ghostwriter",
    rows: [
      { capability: "Posts in your voice", followerSpike: "Drafts written against a saved voice profile, reviewed before anything publishes", alternative: "High-touch writing support" },
      { capability: "Three platforms", followerSpike: "One draft, native variants for X, LinkedIn, and Bluesky", alternative: "Usually one platform per engagement" },
      { capability: "Publishing", followerSpike: "Scheduled and posted through each platform's official API", alternative: "Usually handed back for you to post" },
      { capability: "Control", followerSpike: "Pauseable software workflow", alternative: "Depends on the retainer process" },
    ],
    faq: [
      { question: "Should I fire my ghostwriter?", answer: "Not necessarily. FollowerSpike is strongest when the writing exists and the repeatable part, adapting it and getting it out, is what keeps slipping." },
    ],
  },
  {
    slug: "linkedin-agency-vs-followerspike",
    title: "LinkedIn Agency vs FollowerSpike",
    description: "Compare agency execution with software you run yourself across X, LinkedIn, and Bluesky.",
    competitor: "LinkedIn agency",
    rows: [
      { capability: "Cost", followerSpike: "$19, $39, and $79 plans", alternative: "Typically custom monthly retainers" },
      { capability: "Speed", followerSpike: "Self-serve queue and tools", alternative: "Depends on account manager cadence" },
      { capability: "Transparency", followerSpike: "Visible queue, logs, limits, and pause", alternative: "Depends on reporting quality" },
      { capability: "Execution", followerSpike: "Drafting, per-platform variants, scheduling, and post-publish automations on your own posts", alternative: "Potentially broader done-for-you service" },
    ],
    faq: [
      { question: "Can agencies use FollowerSpike?", answer: "Yes. The Agency plan carries 15 connected accounts across client workspaces, with a separate saved voice per client." },
    ],
  },
  {
    slug: "manual-linkedin-vs-autopilot",
    title: "Posting by Hand vs FollowerSpike",
    description: "Compare doing everything yourself with a review-first queue that adapts the post per platform and schedules it.",
    competitor: "Manual posting",
    rows: [
      { capability: "Consistency", followerSpike: "A queue of drafts reduces blank-page friction", alternative: "Depends on your calendar" },
      { capability: "Profile", followerSpike: "Spike Rank scores positioning, proof, cadence, engagement, and conversion path", alternative: "Guesswork, or a second opinion" },
      { capability: "After the post", followerSpike: "First comment, auto-plug, and evergreen recycling on your own posts", alternative: "Easy to forget" },
      { capability: "Safety", followerSpike: "Consent, caps, logs, and pause controls", alternative: "Fully manual control" },
    ],
    faq: [
      { question: "Is manual safer?", answer: "Manual action gives maximum control. FollowerSpike is designed for people who still want review and limits while saving time." },
    ],
  },
];


export function getFeaturePage(slug: string) {
  return featurePages.find((page) => page.slug === slug);
}

export function getFreeTool(slug: string) {
  return freeTools.find((tool) => tool.slug === slug);
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRolePage(slug: string) {
  return buildRolePages().find((page) => page.slug === slug);
}

export function getIndustryPage(slug: string) {
  return buildIndustryPages().find((page) => page.slug === slug);
}

export function getIcpPage(slug: string) {
  return icpPages.find((page) => page.slug === slug);
}

export function getComparisonPage(slug: string) {
  return comparisonPages.find((page) => page.slug === slug);
}
