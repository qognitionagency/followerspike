import {
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CalendarDays,
  FileSearch,
  Gauge,
  Handshake,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { INDUSTRIES, ROLES, ROUTES } from "@/lib/constants";

export type MarketingNavItem = {
  label: string;
  href: string;
  description: string;
  badge?: string;
};

export type MarketingNavGroup = {
  title: string;
  items: MarketingNavItem[];
};

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
      "One editor with a live preview per platform, so a thread reads like a thread and a LinkedIn post reads like LinkedIn — not like a repost.",
    icon: Layers3,
    highlights: ["Per-platform previews", "Thread builder", "Link preview control", "Drafts"],
    workflow: [
      { title: "Write it once", body: "Draft in a single editor while FollowerSpike tracks each platform's limits: 280 characters on X, 300 on Bluesky, 3,000 on LinkedIn." },
      { title: "See it as they will", body: "Previews render the real thing — thread splits, truncation points, and where a link preview will appear." },
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
      "Pick a founder voice, answer ten questions, or clone your best posts. All three produce the same thing: a voice profile every draft is written through.",
    icon: BrainCircuit,
    highlights: ["8 founder presets", "Voice Interview", "Voice Cloner", "Sounds-like-me score"],
    workflow: [
      { title: "Start from anywhere", body: "No posts yet? Take the Voice Interview. Already posting? Clone the voice from your twenty best posts." },
      { title: "Answer by ear, not by theory", body: "The interview shows you the same idea written two ways and asks which sounds more like you. Nobody has to describe their own tone." },
      { title: "Correct it once", body: "Edit a draft and FollowerSpike learns the difference, so the next one starts closer." },
    ],
    faq: [
      { question: "What if I have never posted?", answer: "That is what the Voice Interview is for. It builds a usable voice profile in about three minutes with no post history at all." },
      { question: "Does it invent metrics about my company?", answer: "No. The profile stores the real numbers and milestones you give it, and drafts are held to those." },
    ],
  },
  {
    slug: "spike-rank",
    eyebrow: "Spike Rank",
    title: "Score your profile, then fix what is costing you followers.",
    description:
      "A 0–100 score for each of your X, LinkedIn, and Bluesky profiles across positioning, proof, cadence, engagement, and conversion path.",
    icon: Gauge,
    highlights: ["Per-platform score", "Ranked fix list", "Score history", "Rewrites included"],
    workflow: [
      { title: "Get ranked", body: "Five weighted pillars, each with checks that pass, warn, or fail — and a reason for every one." },
      { title: "See the five that matter", body: "Fixes are ordered by impact against effort, so you know what to do this week rather than someday." },
      { title: "Fix it in the product", body: "Every finding comes with a rewrite you can apply, and the content ideas land straight in your queue." },
    ],
    faq: [
      { question: "How do you read my LinkedIn profile?", answer: "You paste it. LinkedIn does not give third-party apps access to your headline, About, or experience, so we ask for it directly rather than scraping." },
      { question: "Does the score change on its own?", answer: "It is recomputed on a schedule, and the history shows what moved after each fix." },
    ],
  },
  {
    slug: "growth-automations",
    eyebrow: "Automations",
    title: "The posting chores, handled by rule.",
    description:
      "Auto-plug a strong post, drop the link in the first comment, recycle evergreen work, and relay an X thread to LinkedIn — all through official APIs.",
    icon: CalendarDays,
    highlights: ["Auto-Plug", "First Comment", "Evergreen recycling", "Cross-post relay"],
    workflow: [
      { title: "Set the rule", body: "Each automation is a plain trigger and action: when this post passes 500 impressions, reply with the link." },
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
      "When someone comments your keyword, they get the link — by DM on X and Bluesky, by tracked public reply on LinkedIn — and they land in your list.",
    icon: Send,
    highlights: ["Keyword opt-in", "Lead magnet delivery", "Mini-CRM", "Daily caps"],
    workflow: [
      { title: "Pick the keyword", body: "Ask for a comment to get the resource. The comment is the opt-in, so nobody is messaged out of the blue." },
      { title: "Deliver automatically", body: "The link goes out within seconds, capped per day and never twice to the same person." },
      { title: "Keep the lead", body: "Every recipient is saved with their handle and platform, ready for an email sequence." },
    ],
    faq: [
      { question: "Do you send LinkedIn DMs?", answer: "No. LinkedIn has no direct-message API for third parties, so LinkedIn capture uses a tracked public reply instead. We will not automate your LinkedIn inbox." },
      { question: "Can someone opt out?", answer: "Yes. Opt-outs are honored automatically and that person is never messaged again." },
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
      { title: "Connect by OAuth", body: "You authorize each account through the platform itself, and tokens are stored encrypted." },
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
    description: "Bio, pinned post, cadence, reply ratio, and whether anything on your profile leads anywhere. Just enter your handle.",
    category: "Spike Rank",
    inputLabel: "Your X handle",
    inputPlaceholder: "@yourhandle",
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
    description: "Handle, banner, description, posting rhythm, and conversation depth — read live from your public profile.",
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
    inputPlaceholder: "Open your profile, select all, and paste it here — headline, About, and experience.",
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
    description: "The same idea as a tight X post, a Bluesky post, and a LinkedIn post — adapted, not copy-pasted.",
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
    description: "One positioning statement, three native versions — inside each platform's limits and conventions.",
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
    description: "A keyword opt-in post plus the message it triggers, written so it reads like a person and not a funnel.",
    category: "Lead capture",
    inputLabel: "What are you giving away?",
    inputPlaceholder: "A Notion template, a teardown, a spreadsheet, a checklist...",
    contextLabel: "Who should want it?",
    contextPlaceholder: "Solo founders, indie hackers, agency owners...",
    resultLabel: "Post and DM",
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
    description: "A practical guide to using a review-first LinkedIn growth assistant without losing judgment or voice.",
    category: "Autopilot",
    date: "2026-05-16",
    readTime: "7 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "The founder problem", body: "Founders do not usually fail at LinkedIn because they lack ideas. They fail because the channel asks for small consistent actions on days that are already overloaded." },
      { heading: "The right automation boundary", body: "Drafting, scoring, queueing, reminding, and conservative execution can be assisted. Positioning, proof, sensitive replies, and relationship judgment still need the human owner." },
      { heading: "A daily loop that compounds", body: "A useful post, a few relevant comments, a short list of right-fit connections, and light accepted-connection follow-up is enough to create momentum without turning LinkedIn into a second job." },
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
      { heading: "Risk is real", body: "Any platform automation can carry risk. The responsible move is to make consent, limits, logs, and pause behavior visible instead of hiding them." },
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
    description: "Turn a vague audience into specific roles, industries, pains, topics, and seed leaders.",
    category: "Strategy",
    date: "2026-05-16",
    readTime: "8 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Start narrower than feels comfortable", body: "A good LinkedIn ICP should name the person, the context, the pain, and the reason they should care now." },
      { heading: "Translate ICP into behavior", body: "Your ICP should decide what you post, which conversations you join, and who belongs in your connection queue." },
      { heading: "Use seed leaders", body: "Seed leaders help the system understand the market map faster than broad keywords alone." },
    ],
    faq: [
      { question: "Can I target multiple ICPs?", answer: "Yes, but start with one primary audience per growth queue." },
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
      { heading: "Score before writing", body: "A relevance score keeps you out of conversations that are popular but commercially irrelevant." },
    ],
    faq: [
      { question: "Should comments include a CTA?", answer: "Usually no. Comments should earn attention first." },
    ],
  },
  {
    slug: "connection-requests-that-do-not-feel-spammy",
    title: "Connection Requests That Do Not Feel Spammy",
    description: "How to connect with right-fit people without sounding like a cold outbound sequence.",
    category: "Network",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Specific beats clever", body: "A good connection note says why this person, why now, and why it is low-pressure." },
      { heading: "Keep daily volume conservative", body: "A small number of relevant requests beats large volumes that dilute reputation." },
      { heading: "Use context", body: "Target role, recent topic, shared market, and seed leader proximity all make the request feel more natural." },
    ],
    faq: [
      { question: "Should every request include a note?", answer: "Not always. Sometimes a clean request is better than a forced note." },
    ],
  },
  {
    slug: "follow-up-dms-after-acceptance",
    title: "Follow-up DMs After Acceptance",
    description: "A human way to continue the conversation after someone accepts your connection request.",
    category: "DMs",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "Do not pitch immediately", body: "The first follow-up should create context, not pressure." },
      { heading: "Reference the reason", body: "Mention the topic, market, or reason you connected so the message feels grounded." },
      { heading: "Keep replies reviewable", body: "Relationship moments should stay easy to approve, edit, or take over manually." },
    ],
    faq: [
      { question: "Does FollowerSpike send cold DM blasts?", answer: "No. V1 focuses on accepted-connection follow-ups." },
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
      { heading: "Spend time where buyers already listen", body: "Engage with local leaders, industry operators, and buyer-adjacent conversations." },
      { heading: "Keep it repeatable", body: "A small daily queue beats an ambitious plan that disappears after three days." },
    ],
    faq: [
      { question: "Can SMB owners grow without posting daily?", answer: "Yes, but consistent posting plus targeted engagement compounds faster." },
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
      { heading: "Follow up lightly", body: "A thoughtful accepted-connection follow-up can open conversation without pressure." },
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
      { heading: "Comment where buying committees learn", body: "Engagement works best around operators, partners, and market educators." },
      { heading: "Build a useful network", body: "Connection requests should support a market map, not vanity follower count." },
    ],
    faq: [
      { question: "Can consultants use autopilot safely?", answer: "They can use review-first workflows and conservative execution once targeting is proven." },
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
      { heading: "Ghostwriters help with voice", body: "A ghostwriter can be useful for high-touch content, but usually does not handle daily engagement, connections, and follow-up." },
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
      { heading: "Connect content to action", body: "The best calendar also informs comments, connection targets, and follow-ups." },
    ],
    faq: [
      { question: "How many posts should founders publish?", answer: "Start with three to five useful posts a week and increase only when the workflow is stable." },
    ],
  },
  {
    slug: "what-followerspike-automates",
    title: "What FollowerSpike Does and Does Not Automate",
    description: "A transparent overview of the product boundaries for LinkedIn growth workflows.",
    category: "Product",
    date: "2026-05-16",
    readTime: "5 min read",
    author: "FollowerSpike Team",
    sections: [
      { heading: "What it helps with", body: "FollowerSpike helps with posts, engagement queues, connection requests, accepted-connection follow-ups, reply drafts, review controls, and limits." },
      { heading: "What it avoids", body: "It does not support CAPTCHA bypass, ban evasion, mass scraping, fake engagement pods, or spammy cold DM sequences." },
      { heading: "Why boundaries matter", body: "Professional accounts need growth that compounds reputation instead of risking it for short-term activity." },
    ],
    faq: [
      { question: "Can I pause everything?", answer: "Yes. Pause controls and session deletion are part of the product." },
    ],
  },
];

const roleFocus: Record<string, string> = {
  Founder: "turn founder lessons, customer conversations, and market beliefs into consistent LinkedIn growth",
  "Small Business Owner": "turn customer proof, local expertise, and daily operator lessons into trust",
  "Executive Coach": "share coaching insights without exposing private client context",
  Consultant: "show diagnostic thinking and attract decision-makers around a clear problem",
  "Content Creator": "convert attention into a more intentional professional network",
  "Agency Owner": "build authority while keeping outreach and engagement focused",
};

export function buildRolePages(): AudiencePage[] {
  return ROLES.map((role) => {
    const focus = roleFocus[role] ?? `build a sharper LinkedIn presence as a ${role}`;
    return {
      slug: slugifyMarketing(role),
      type: "role",
      name: role,
      eyebrow: "Role playbook",
      title: `LinkedIn growth autopilot for ${role}s`,
      description: `FollowerSpike helps ${role}s ${focus} with posts, engagement, connections, follow-ups, and review controls.`,
      pain: `${role}s need consistent visibility, but daily posting, commenting, connecting, and follow-up often fall behind client work and operations.`,
      workflow: ["Define the audience and seed leaders", "Generate the daily growth queue", "Review posts, comments, and connection requests", "Run conservative Pro autopilot when ready"],
      features: ["Voice-aware posts", "Relevant engagement queue", "Right-fit connection requests", "Accepted-connection follow-up drafts"],
      faq: [
        { question: `Can ${role}s keep approval turned on?`, answer: "Yes. Review mode can stay on permanently." },
        { question: "Does this replace human judgment?", answer: "No. FollowerSpike prepares the daily work and keeps sensitive moments reviewable." },
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
    title: `LinkedIn growth autopilot for ${industry}`,
    description: `FollowerSpike helps ${industry} professionals build account growth around useful posts, relevant conversations, right-fit connections, and accepted-connection follow-ups.`,
    pain: `${industry} audiences are specific. Generic content and random engagement rarely create trust with the right people.`,
    workflow: ["Map the industry conversation", "Choose roles and seed leaders", "Draft posts from real expertise", "Queue comments, connections, and follow-ups"],
    features: ["Industry-specific topics", "Audience relevance scoring", "Connection targeting", "Safety and pause controls"],
    faq: [
      { question: `Can FollowerSpike adapt to ${industry}?`, answer: "Yes. The workflow starts with niche, audience, seed leaders, and approved voice notes." },
      { question: "Will generated pages be thin?", answer: "No. Each industry page includes unique context, workflow, features, FAQs, and internal links." },
    ],
  }));
}

export const icpPages: AudiencePage[] = [
  ["founder-led-saas", "Founder-led SaaS", "reach operators, buyers, partners, and investors with clear founder-led positioning"],
  ["local-service-businesses", "Local service businesses", "turn local proof and operator expertise into a visible professional network"],
  ["coaching-and-advisory", "Coaching and advisory", "attract clients through useful teaching, trust signals, and warm follow-up"],
  ["consulting-firms", "Consulting firms", "show diagnostic expertise and build relationships with decision-makers"],
  ["creator-led-businesses", "Creator-led businesses", "connect attention, expertise, and relationship-building into one workflow"],
  ["agencies-and-studios", "Agencies and studios", "turn client work, frameworks, and market observations into authority"],
].map(([slug, name, focus]) => ({
  slug,
  type: "icp",
  name,
  eyebrow: "ICP playbook",
  title: `LinkedIn growth system for ${name}`,
  description: `FollowerSpike helps ${name} ${focus}.`,
  pain: `${name} need consistent relationship-building, not a feed full of generic posts and disconnected outreach.`,
  workflow: ["Name the buying committee", "Choose seed leaders and trigger topics", "Build a daily queue", "Review and run with conservative limits"],
  features: ["ICP builder", "Topic map", "Engagement scoring", "Follow-up prompts"],
  faq: [
    { question: "Can I edit the ICP later?", answer: "Yes. ICP, seed leaders, and topics should evolve as the market responds." },
    { question: "Does this create cold DM sequences?", answer: "No. Follow-ups focus on accepted connections and reviewable replies." },
  ],
}));

export const comparisonPages: ComparisonPage[] = [
  {
    slug: "ghostwriter-vs-linkedin-autopilot",
    title: "Ghostwriter vs LinkedIn Autopilot",
    description: "Compare high-touch content help with a daily growth workflow that also covers comments, connections, and follow-ups.",
    competitor: "Ghostwriter",
    rows: [
      { capability: "Posts in your voice", followerSpike: "AI drafts with review and reusable voice rules", alternative: "High-touch writing support" },
      { capability: "Engagement", followerSpike: "Relevant comments and likes in the queue", alternative: "Usually outside the writing scope" },
      { capability: "Connections", followerSpike: "Targeted requests with daily caps", alternative: "Usually manual or separate service" },
      { capability: "Control", followerSpike: "Pauseable software workflow", alternative: "Depends on the retainer process" },
    ],
    faq: [
      { question: "Should I fire my ghostwriter?", answer: "Not necessarily. FollowerSpike is strongest when you need repeatable daily execution around the content." },
    ],
  },
  {
    slug: "linkedin-agency-vs-followerspike",
    title: "LinkedIn Agency vs FollowerSpike",
    description: "Compare agency execution with a lower-cost product workflow for daily LinkedIn account growth.",
    competitor: "LinkedIn agency",
    rows: [
      { capability: "Cost", followerSpike: "$9, $29, or $49 plans", alternative: "Typically custom monthly retainers" },
      { capability: "Speed", followerSpike: "Self-serve queue and tools", alternative: "Depends on account manager cadence" },
      { capability: "Transparency", followerSpike: "Visible queue, logs, limits, and pause", alternative: "Depends on reporting quality" },
      { capability: "Execution", followerSpike: "Software-assisted posts, engagement, connections, and follow-up", alternative: "Potentially broader done-for-you service" },
    ],
    faq: [
      { question: "Can agencies use FollowerSpike?", answer: "Yes, but the current pricing is oriented around one LinkedIn profile." },
    ],
  },
  {
    slug: "manual-linkedin-vs-autopilot",
    title: "Manual LinkedIn vs Autopilot",
    description: "Compare doing everything yourself with a review-first queue for daily growth actions.",
    competitor: "Manual LinkedIn",
    rows: [
      { capability: "Consistency", followerSpike: "Daily queue reduces blank-page friction", alternative: "Depends on your calendar" },
      { capability: "Targeting", followerSpike: "ICP, seed leaders, and relevance scoring", alternative: "Often reactive and random" },
      { capability: "Follow-up", followerSpike: "Accepted-connection DMs and reply drafts", alternative: "Easy to forget" },
      { capability: "Safety", followerSpike: "Consent, caps, logs, and pause controls", alternative: "Fully manual control" },
    ],
    faq: [
      { question: "Is manual safer?", answer: "Manual action gives maximum control. FollowerSpike is designed for people who still want review and limits while saving time." },
    ],
  },
];

export const marketingNav: MarketingNavGroup[] = [
  {
    title: "Product",
    items: [
      { label: "Overview", href: ROUTES.home, description: "Interactive product-led overview." },
      ...featurePages.map((feature) => ({
        label: feature.eyebrow === "Autopilot" ? "LinkedIn Autopilot" : feature.eyebrow,
        href: `/features/${feature.slug}`,
        description: feature.description,
        badge: feature.slug === "linkedin-autopilot" ? "Core" : undefined,
      })),
    ],
  },
  {
    title: "Solutions",
    items: [
      { label: "For founders", href: "/roles/founder", description: "Founder visibility without daily LinkedIn work." },
      { label: "For SMB owners", href: "/roles/small-business-owner", description: "Turn customer proof into account growth." },
      { label: "For coaches", href: "/roles/executive-coach", description: "Teach expertise and follow up tastefully." },
      { label: "For consultants", href: "/roles/consultant", description: "Build authority around your diagnostic lens." },
      { label: "Roles hub", href: "/roles", description: "Browse all role-based playbooks." },
      { label: "Industries hub", href: "/industries", description: "Browse industry-specific growth pages." },
    ],
  },
  {
    title: "Free Tools",
    items: [
      { label: "All free tools", href: "/free-tools", description: "Functional LinkedIn growth tools." },
      ...freeTools.slice(0, 8).map((tool) => ({
        label: tool.name,
        href: `/free-tools/${tool.slug}`,
        description: tool.description,
      })),
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Blog", href: "/blog", description: "Guides on LinkedIn autopilot, ICP, safety, and growth." },
      { label: "Comparisons", href: "/compare/ghostwriter-vs-linkedin-autopilot", description: "Compare software, agencies, ghostwriters, and manual work." },
      { label: "Trust center", href: ROUTES.trust, description: "Safety, consent, platform risk, and controls." },
      { label: "Security", href: ROUTES.security, description: "Privacy and security foundations." },
      { label: "Pricing", href: ROUTES.pricing, description: "$9, $29, and $49 plans." },
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
