"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Gauge, MessageSquareText, PauseCircle, PenLine, Send, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const personas = [
  {
    id: "founder",
    label: "Founder",
    icp: "B2B SaaS operators",
    post: "The best founder-led LinkedIn strategy is not posting more. It is turning real operating lessons into useful public signal.",
    comment: "This is the hidden constraint: founders need a repeatable loop, not another blank content calendar.",
    connection: "SaaS founder hiring first revenue leader",
    dm: "Thanks for connecting. I saw your post about GTM systems and it felt close to what I am building around founder-led distribution.",
    limits: "2 posts, 12 comments, 12 connections",
  },
  {
    id: "coach",
    label: "Coach",
    icp: "Executives and operators",
    post: "Most coaching content is too abstract. The posts that work make one invisible leadership pattern easy to recognize.",
    comment: "The practical part here is naming the behavior before prescribing the fix. That is where trust starts.",
    connection: "Operator posting about leadership transitions",
    dm: "Glad to connect. I usually share practical notes on leadership patterns and useful reflection prompts.",
    limits: "1 post, 10 comments, 8 connections",
  },
  {
    id: "smb",
    label: "SMB owner",
    icp: "Local buyers and partners",
    post: "Small businesses already have content. It is hiding in customer questions, objections, and the jobs they keep doing well.",
    comment: "This resonates. The proof is usually inside the daily work, not inside a polished brand campaign.",
    connection: "Local operator discussing customer retention",
    dm: "Thanks for connecting. I liked your point about retention because it maps to what I see with service businesses too.",
    limits: "1 post, 8 comments, 6 connections",
  },
] as const;

const queueMeta = [
  { label: "Post", icon: PenLine, status: "Ready" },
  { label: "Comment", icon: MessageSquareText, status: "94% fit" },
  { label: "Connect", icon: UserPlus, status: "ICP match" },
  { label: "Follow-up", icon: Send, status: "Accepted" },
] as const;

export function SandboxDemo() {
  const [personaId, setPersonaId] = useState<(typeof personas)[number]["id"]>("founder");
  const [autopilot, setAutopilot] = useState(false);
  const reduceMotion = useReducedMotion();
  const persona = useMemo(() => personas.find((item) => item.id === personaId) ?? personas[0], [personaId]);

  const queue = [
    { label: "Today’s post", body: persona.post, icon: PenLine },
    { label: "Comment draft", body: persona.comment, icon: MessageSquareText },
    { label: "Connection request", body: persona.connection, icon: UserPlus },
    { label: "Follow-up DM", body: persona.dm, icon: Send },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[#d8d2c4] bg-[#fbfaf7] shadow-[0_24px_80px_rgba(17,24,39,0.14)]">
      <div className="flex flex-col gap-3 border-b border-[#d8d2c4] bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[#0a66c2]">Interactive sandbox</p>
          <p className="mt-1 text-lg font-black text-[#111827]">Daily Growth Autopilot</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#d8d2c4] bg-[#f4f2ee] p-1">
          {personas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPersonaId(item.id)}
              className={cn(
                "h-10 rounded-md px-3 text-sm font-black transition",
                item.id === personaId ? "bg-[#111827] text-white" : "text-[#4b5563] hover:bg-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid bg-[#d8d2c4] lg:grid-cols-[0.72fr_1.28fr] lg:gap-px">
        <div className="bg-[#111827] p-5 text-white">
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs font-black uppercase text-cyan-200">ICP selected</p>
            <h3 className="mt-2 text-2xl font-black">{persona.icp}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              FollowerSpike converts the ICP into post angles, target conversations, people to connect with, and safe limits.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {queueMeta.map((item, index) => (
              <motion.div
                key={item.label}
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-3"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <item.icon className="h-4 w-4 text-cyan-200" />
                  {item.label}
                </span>
                <span className="text-xs font-black text-emerald-200">{item.status}</span>
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAutopilot((value) => !value)}
            className={cn(
              "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-black transition",
              autopilot ? "bg-emerald-400 text-[#062314] hover:bg-emerald-300" : "bg-white text-[#111827] hover:bg-cyan-50"
            )}
          >
            {autopilot ? <ShieldCheck className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
            {autopilot ? "Autopilot preview active" : "Preview autopilot controls"}
          </button>
        </div>

        <div className="bg-white p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {queue.map((item, index) => (
                <motion.article
                  key={`${persona.id}-${item.label}`}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="rounded-lg border border-[#e5dfd1] bg-[#fbfaf7] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-black text-[#111827]">
                      <item.icon className="h-4 w-4 text-[#0a66c2]" />
                      {item.label}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                      <Check className="mr-1 inline h-3 w-3" />
                      Review
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#374151]">{item.body}</p>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-4 grid gap-3 rounded-lg border border-[#d8d2c4] bg-[#f4f2ee] p-4 sm:grid-cols-3">
            {[
              ["Limits", persona.limits],
              ["Window", "9am-6pm local"],
              ["Mode", autopilot ? "Conservative Pro" : "Review first"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-black uppercase text-[#6b7280]">{label}</p>
                <p className="mt-1 text-sm font-black text-[#111827]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#cdebd9] bg-[#effaf3] p-4 text-sm leading-6 text-[#14532d]">
            <Gauge className="h-5 w-5 shrink-0" />
            No live LinkedIn action happens in this demo. It shows the public product workflow only.
          </div>
        </div>
      </div>
    </div>
  );
}
