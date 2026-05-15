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
    slug: "linkedin-autopilot",
    eyebrow: "Autopilot",
    title: "Run a conservative daily LinkedIn growth loop.",
    description:
      "FollowerSpike turns posting, engagement, connection requests, and accepted-connection follow-ups into one reviewable workflow.",
    icon: Gauge,
    highlights: ["Daily queue", "Timing windows", "Pause controls", "Pro execution gate"],
    workflow: [
      { title: "Plan the queue", body: "Generate posts, target conversations, people to connect with, and follow-up DMs from one profile." },
      { title: "Review the work", body: "Approve, edit, skip, or regenerate before FollowerSpike executes anything." },
      { title: "Run with limits", body: "Autopilot only runs after consent, inside daily caps, and can auto-pause when risk rises." },
    ],
    faq: [
      { question: "Does it run without consent?", answer: "No. Live execution requires explicit consent, risk acknowledgement, and Pro plan access." },
      { question: "Can I keep review mode forever?", answer: "Yes. Review mode is the default and can stay enabled for all growth actions." },
    ],
  },
  {
    slug: "ai-linkedin-posts",
    eyebrow: "AI posts",
    title: "Create LinkedIn posts in your own voice.",
    description:
      "Use your profile, niche, ICP, and approved examples to draft useful LinkedIn posts without sounding generic.",
    icon: PenLine,
    highlights: ["Voice profile", "Post templates", "Idea queue", "Review controls"],
    workflow: [
      { title: "Train the voice", body: "Start from a profile URL, positioning notes, and the themes you want to own." },
      { title: "Draft useful posts", body: "Generate hooks, story angles, tactical posts, and soft calls to conversation." },
      { title: "Keep control", body: "Edit before publishing and avoid invented claims, fake proof, or overpolished AI wording." },
    ],
    faq: [
      { question: "Will it copy my exact old posts?", answer: "No. It learns structure and tone while avoiding copied wording." },
      { question: "Can I use it without autopilot?", answer: "Yes. Essentials is designed for content and manual review." },
    ],
  },
  {
    slug: "engagement-queue",
    eyebrow: "Engagement",
    title: "Find the right conversations before you comment.",
    description:
      "FollowerSpike scores relevance, drafts thoughtful comments, and keeps engagement focused on people who matter to your market.",
    icon: MessageSquareText,
    highlights: ["Relevant posts", "Comment drafts", "Like queue", "ICP scoring"],
    workflow: [
      { title: "Set ICP signals", body: "Define roles, industries, topics, and seed leaders that match your growth strategy." },
      { title: "Score conversations", body: "Prioritize conversations with audience fit instead of random trending content." },
      { title: "Engage with taste", body: "Draft comments that add substance, not generic praise or promotional noise." },
    ],
    faq: [
      { question: "Does it create engagement pods?", answer: "No. FollowerSpike does not support fake engagement pods." },
      { question: "Can I approve comments first?", answer: "Yes. Review mode keeps comments in the queue until approved." },
    ],
  },
  {
    slug: "connection-requests",
    eyebrow: "Connections",
    title: "Connect with the people your market already trusts.",
    description:
      "Build a daily list of founders, buyers, operators, coaches, and industry leaders that match your ideal audience.",
    icon: UserRoundCheck,
    highlights: ["Target leaders", "ICP matching", "Connection notes", "Daily caps"],
    workflow: [
      { title: "Choose seed leaders", body: "Start with people, companies, roles, and topics that define the network you want." },
      { title: "Review matches", body: "See why each profile fits before any connection request is queued." },
      { title: "Send conservatively", body: "Use low daily limits and pause controls instead of mass outbound behavior." },
    ],
    faq: [
      { question: "Does it mass scrape LinkedIn?", answer: "No. The product avoids mass scraping and focuses on conservative account workflows." },
      { question: "Can I skip a person?", answer: "Yes. Every queued profile can be skipped before execution." },
    ],
  },
  {
    slug: "follow-up-dms",
    eyebrow: "Follow-up",
    title: "Follow up after a connection accepts.",
    description:
      "Prepare light, relevant DMs for accepted connections without turning your account into a cold sequence machine.",
    icon: Send,
    highlights: ["Accepted connections", "Reply drafts", "No spam sequences", "Approval-first"],
    workflow: [
      { title: "Wait for acceptance", body: "V1 follow-ups focus on people who already accepted the connection." },
      { title: "Draft naturally", body: "Use context from the person, role, and reason you connected to keep the message human." },
      { title: "Review replies", body: "Keep replies easy to approve, edit, or pause when the conversation needs your judgment." },
    ],
    faq: [
      { question: "Does it run cold DM blasts?", answer: "No. Cold DM sequences are intentionally out of scope." },
      { question: "Can replies stay manual?", answer: "Yes. Reply drafts can remain review-only." },
    ],
  },
  {
    slug: "safety-controls",
    eyebrow: "Safety",
    title: "Keep account growth pauseable and transparent.",
    description:
      "Consent, review, daily caps, time windows, logs, and auto-pause behavior keep growth workflows sober.",
    icon: ShieldCheck,
    highlights: ["Consent history", "Daily limits", "Activity logs", "Session deletion"],
    workflow: [
      { title: "Start in review", body: "New users begin with queue review before live actions are enabled." },
      { title: "Set limits", body: "Daily post, comment, invite, and like caps shape conservative behavior." },
      { title: "Pause fast", body: "Users can pause manually, delete sessions, or rely on auto-pause after repeated errors." },
    ],
    faq: [
      { question: "Is FollowerSpike affiliated with LinkedIn?", answer: "No. FollowerSpike is independent and does not claim LinkedIn endorsement." },
      { question: "Does automation carry risk?", answer: "Yes. The product reduces risk with controls but cannot guarantee platform outcomes." },
    ],
  },
];

export const freeTools: FreeToolDefinition[] = [
  {
    slug: "linkedin-profile-audit",
    name: "LinkedIn Profile Audit",
    title: "Score your LinkedIn profile and get a rebuild plan.",
    description: "Analyze positioning, proof, keywords, and conversion gaps from one profile URL.",
    category: "Audit",
    inputLabel: "LinkedIn profile URL",
    inputPlaceholder: "https://www.linkedin.com/in/yourname",
    contextLabel: "Goal",
    contextPlaceholder: "Inbound leads, hiring, investor visibility...",
    resultLabel: "Profile audit",
    cta: "Turn this audit into your first growth queue",
    icon: FileSearch,
  },
  {
    slug: "linkedin-headline-analyzer",
    name: "LinkedIn Headline Analyzer",
    title: "Check whether your headline says who you help and why.",
    description: "Get a score, sharper positioning angle, and rewrite prompts for your headline.",
    category: "Profile",
    inputLabel: "Current headline",
    inputPlaceholder: "Founder at Acme helping B2B teams...",
    contextLabel: "Ideal audience",
    contextPlaceholder: "Who should this headline attract?",
    resultLabel: "Headline score",
    cta: "Save the headline direction to FollowerSpike",
    icon: BrainCircuit,
  },
  {
    slug: "linkedin-post-generator",
    name: "LinkedIn Post Generator",
    title: "Generate a useful LinkedIn post from one idea.",
    description: "Turn a rough idea into a founder-led post with a specific takeaway.",
    category: "Content",
    inputLabel: "Post idea",
    inputPlaceholder: "A lesson from a customer call, hiring mistake, or market observation...",
    contextLabel: "Voice or niche",
    contextPlaceholder: "Direct, practical, B2B SaaS founder...",
    resultLabel: "Generated post",
    cta: "Build a weekly post queue",
    icon: PenLine,
  },
  {
    slug: "linkedin-comment-generator",
    name: "LinkedIn Comment Generator",
    title: "Write a comment that adds to the conversation.",
    description: "Paste a target post and get a thoughtful non-promotional comment draft.",
    category: "Engagement",
    inputLabel: "Target post",
    inputPlaceholder: "Paste the LinkedIn post you want to reply to...",
    contextLabel: "Your point of view",
    contextPlaceholder: "What do you agree with, challenge, or add?",
    resultLabel: "Comment draft",
    cta: "Create an engagement queue",
    icon: MessageSquareText,
  },
  {
    slug: "connection-note-generator",
    name: "Connection Note Generator",
    title: "Draft a connection note that feels specific.",
    description: "Create a light connection request note based on audience, role, and reason.",
    category: "Network",
    inputLabel: "Who are you connecting with?",
    inputPlaceholder: "Example: SaaS founder hiring first sales leader...",
    contextLabel: "Why connect?",
    contextPlaceholder: "Shared market, thoughtful post, potential partnership...",
    resultLabel: "Connection note",
    cta: "Find more right-fit people",
    icon: Handshake,
  },
  {
    slug: "follow-up-dm-generator",
    name: "Follow-up DM Generator",
    title: "Write a warm follow-up after someone accepts.",
    description: "Generate a low-pressure accepted-connection follow-up without a salesy sequence.",
    category: "DMs",
    inputLabel: "Connection context",
    inputPlaceholder: "They accepted after posting about GTM, coaching, hiring...",
    contextLabel: "Your goal",
    contextPlaceholder: "Start a conversation, share a useful resource, learn about their work...",
    resultLabel: "Follow-up draft",
    cta: "Manage follow-ups in the Pro queue",
    icon: Send,
  },
  {
    slug: "linkedin-icp-builder",
    name: "LinkedIn ICP Builder",
    title: "Define who your LinkedIn activity should attract.",
    description: "Turn a broad market into roles, pains, trigger topics, and seed leader ideas.",
    category: "Strategy",
    inputLabel: "What do you sell or teach?",
    inputPlaceholder: "Example: advisory for B2B founders building outbound systems...",
    contextLabel: "Current audience",
    contextPlaceholder: "Founders, coaches, SMB owners, consultants...",
    resultLabel: "ICP brief",
    cta: "Use this ICP to personalize the queue",
    icon: Target,
  },
  {
    slug: "linkedin-content-calendar",
    name: "LinkedIn Content Calendar",
    title: "Create a one-week LinkedIn posting plan.",
    description: "Map seven post angles around your audience, offer, and proof points.",
    category: "Content",
    inputLabel: "Topic or offer",
    inputPlaceholder: "Example: helping SMB owners create reliable inbound from LinkedIn...",
    contextLabel: "Audience",
    contextPlaceholder: "Who should the calendar speak to?",
    resultLabel: "7-day plan",
    cta: "Generate these posts in FollowerSpike",
    icon: CalendarDays,
  },
  {
    slug: "linkedin-post-formatter",
    name: "LinkedIn Post Formatter",
    title: "Make a draft easier to read on LinkedIn.",
    description: "Format a rough draft into clearer spacing, hook, body, and CTA.",
    category: "Content",
    inputLabel: "Rough draft",
    inputPlaceholder: "Paste your draft...",
    contextLabel: "Desired tone",
    contextPlaceholder: "Concise, founder-led, tactical, warm...",
    resultLabel: "Formatted draft",
    cta: "Save reusable voice rules",
    icon: Layers3,
  },
  {
    slug: "linkedin-topic-hashtag-tool",
    name: "Topic and Hashtag Tool",
    title: "Find topic pillars and low-noise hashtags.",
    description: "Generate recurring themes, post angles, and restrained hashtag suggestions.",
    category: "Strategy",
    inputLabel: "Niche",
    inputPlaceholder: "Example: AI operations for boutique agencies...",
    contextLabel: "Audience",
    contextPlaceholder: "Who should see these topics?",
    resultLabel: "Topic map",
    cta: "Turn topics into a growth plan",
    icon: BarChart3,
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
