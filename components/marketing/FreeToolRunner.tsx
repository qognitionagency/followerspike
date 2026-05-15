"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FreeToolResult } from "@/lib/marketing/content";

type FreeToolRunnerProps = {
  tool: {
    slug: string;
    category: string;
    inputLabel: string;
    inputPlaceholder: string;
    contextLabel?: string;
    contextPlaceholder?: string;
    resultLabel: string;
  };
};

export function FreeToolRunner({ tool }: FreeToolRunnerProps) {
  const [result, setResult] = useState<FreeToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const payload = {
        primaryText: String(formData.get("primaryText") ?? ""),
        context: String(formData.get("context") ?? "") || undefined,
        email: String(formData.get("email") ?? "") || undefined,
      };

      const response = await fetch(`/api/free-tools/${tool.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setResult(null);
        setError("Check the input and try again.");
        return;
      }

      setResult((await response.json()) as FreeToolResult);
    });
  }

  const PrimaryField = tool.slug.includes("post") || tool.slug.includes("comment") || tool.slug.includes("formatter") ? Textarea : Input;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form action={onSubmit} className="rounded-lg border border-[#d8d2c4] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-[#0a66c2]">
          <Sparkles className="h-4 w-4" />
          {tool.category}
        </div>
        <h2 className="mt-3 text-2xl font-black text-[#111827]">Run the tool</h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-[#374151]">
            {tool.inputLabel}
            <PrimaryField
              name="primaryText"
              required
              placeholder={tool.inputPlaceholder}
              className={tool.slug.includes("post") || tool.slug.includes("comment") || tool.slug.includes("formatter") ? "min-h-32 bg-white" : "h-12 bg-white"}
            />
          </label>
          {tool.contextLabel ? (
            <label className="grid gap-2 text-sm font-bold text-[#374151]">
              {tool.contextLabel}
              <Input name="context" placeholder={tool.contextPlaceholder} className="h-12 bg-white" />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-bold text-[#374151]">
            Email for full report or save-to-app
            <Input name="email" type="email" placeholder="you@company.com" className="h-12 bg-white" />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
        <Button disabled={isPending} className="mt-5 h-12 w-full rounded-lg bg-[#111827] text-base font-black text-white hover:bg-[#0a66c2]">
          {isPending ? "Generating..." : "Generate Free Result"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#6b7280]">
          <Mail className="h-4 w-4" />
          Instant lightweight result. Email is optional.
        </p>
      </form>

      <div className="rounded-lg border border-[#d8d2c4] bg-[#111827] p-5 text-white shadow-sm">
        {result ? (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-cyan-200">{tool.resultLabel}</p>
                <h2 className="mt-2 text-3xl font-black">{result.title}</h2>
              </div>
              {typeof result.score === "number" ? (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white text-xl font-black text-[#111827]">
                  {Math.round(result.score)}
                </div>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{result.summary}</p>
            <div className="mt-5 grid gap-3">
              {result.sections.map((section) => (
                <section key={section.title} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                  <h3 className="font-black text-white">{section.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">{section.body}</p>
                  {section.items ? (
                    <ul className="mt-3 grid gap-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-slate-200">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-emerald-400 p-4 text-sm font-black text-[#062314]">{result.cta}</div>
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col justify-center">
            <p className="text-sm font-black uppercase text-cyan-200">Preview</p>
            <h2 className="mt-3 text-4xl font-black">Your result appears here instantly.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Each free tool returns a useful lightweight result in-browser. Add email only when you want the report saved or sent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
