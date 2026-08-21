import { z } from "zod";

/**
 * The Voice Interview.
 *
 * Pricing sells this as "build your voice with no posts to import", which is
 * the whole reason it exists: importing exemplars is strictly better signal,
 * but a founder who has never posted has none, and asking them to write five
 * posts before the product works is how onboarding dies.
 *
 * The questions below are the entire cold-start signal, so they are written to
 * elicit *specifics* rather than self-description. "Describe your tone" reliably
 * returns "professional but approachable" from everyone; asking for the last
 * thing they explained to a customer returns their actual sentences.
 */

export type InterviewQuestion = {
  id: string;
  prompt: string;
  /** Shown under the field — what a useful answer looks like. */
  help: string;
  /** Long-form answers get a textarea, short ones an input. */
  long: boolean;
  /** A blank answer is allowed on optional questions; synthesis just gets less to work with. */
  required: boolean;
};

/**
 * Ordered, and the order matters: the concrete recall questions come before the
 * abstract preference ones, because answering "what do you never say" is much
 * easier once you have just written two paragraphs in your own voice.
 */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "explain_product",
    prompt: "Explain what you build to someone who has never heard of it.",
    help: "Write it the way you would say it out loud, not the way it appears on your website.",
    long: true,
    required: true,
  },
  {
    id: "recent_lesson",
    prompt: "What is something you learned the hard way in the last year?",
    help: "A specific incident beats a general principle — the details are the voice.",
    long: true,
    required: true,
  },
  {
    id: "disagree",
    prompt: "What does most of your industry believe that you think is wrong?",
    help: "Say it as bluntly as you actually believe it.",
    long: true,
    required: false,
  },
  {
    id: "audience",
    prompt: "Who are you writing for, and what do you want them to think of you?",
    help: "Their job, their problem, and the reputation you want with them.",
    long: true,
    required: true,
  },
  {
    id: "admired",
    prompt: "Whose writing online do you actually enjoy reading?",
    help: "Names or handles are fine. This calibrates register, not content.",
    long: false,
    required: false,
  },
  {
    id: "never_say",
    prompt: "What words or phrases would you never use?",
    help: "Comma-separated. Corporate filler, buzzwords, anything that makes you cringe.",
    long: false,
    required: false,
  },
  {
    id: "signature_phrases",
    prompt: "Are there words or phrases you use constantly?",
    help: "Comma-separated. Verbal tics count — they are often the most recognisable part.",
    long: false,
    required: false,
  },
  {
    id: "grounding_facts",
    prompt: "What facts about you or your company should always be safe to state?",
    help: "Role, company, product, any numbers you are happy to see published. One per line.",
    long: true,
    required: false,
  },
];

export const REQUIRED_QUESTION_IDS = INTERVIEW_QUESTIONS.filter((question) => question.required).map(
  (question) => question.id
);

/** Answers keyed by question id. Unknown keys are dropped rather than stored. */
export const interviewAnswersSchema = z.record(z.string(), z.string().max(4000));

export type InterviewAnswers = z.infer<typeof interviewAnswersSchema>;

/**
 * Keeps only known questions and trims whitespace.
 *
 * The answers column is replayed into a prompt, so an unbounded key from a form
 * post has no business reaching it.
 */
export function normalizeAnswers(input: Record<string, unknown>): InterviewAnswers {
  const known = new Set(INTERVIEW_QUESTIONS.map((question) => question.id));
  const answers: InterviewAnswers = {};

  for (const [key, value] of Object.entries(input)) {
    if (!known.has(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) answers[key] = trimmed.slice(0, 4000);
  }

  return answers;
}

/** True once every required question has a non-empty answer. */
export function isComplete(answers: InterviewAnswers): boolean {
  return REQUIRED_QUESTION_IDS.every((id) => Boolean(answers[id]?.trim()));
}

/** 0–1, for the progress bar. Counts required questions only, so optional ones cannot stall it. */
export function completionRatio(answers: InterviewAnswers): number {
  if (REQUIRED_QUESTION_IDS.length === 0) return 1;
  const answered = REQUIRED_QUESTION_IDS.filter((id) => Boolean(answers[id]?.trim())).length;
  return answered / REQUIRED_QUESTION_IDS.length;
}

/**
 * Renders the answers as the transcript the synthesis prompt reads.
 *
 * Includes the question text, not just the answer: the model needs to know that
 * a paragraph was written in response to "what did you learn the hard way"
 * rather than "who is your audience", or it flattens them all into one register.
 */
export function transcriptFor(answers: InterviewAnswers): string {
  return INTERVIEW_QUESTIONS.filter((question) => answers[question.id])
    .map((question) => `Q: ${question.prompt}\nA: ${answers[question.id]}`)
    .join("\n\n");
}
