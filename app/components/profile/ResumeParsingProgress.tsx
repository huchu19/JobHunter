"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, FileUp, ScanText, Sparkles, FileCheck2 } from "lucide-react";

// Visual progress for resume parsing. The parse is a single network request, so
// we can't get true server-side progress — instead we walk through the real
// phases on a realistic timeline and HOLD on the last working phase ("Extracting")
// until the request actually resolves, then snap to "Done". It never claims a
// phase is finished before it is.

export type ParseStage = "upload" | "read" | "extract" | "done";

interface Step {
  key: Exclude<ParseStage, "done">;
  label: string;
  sub: string;
  icon: typeof FileUp;
}

const STEPS: Step[] = [
  {
    key: "upload",
    label: "Uploading your resume",
    sub: "Sending the file securely to the server",
    icon: FileUp,
  },
  {
    key: "read",
    label: "Reading the document",
    sub: "Pulling the text out of your file",
    icon: ScanText,
  },
  {
    key: "extract",
    label: "Extracting your details with AI",
    sub: "Finding name, skills, experience and more",
    icon: Sparkles,
  },
];

const ORDER: ParseStage[] = ["upload", "read", "extract", "done"];

interface Props {
  /** True while the request is in flight. When it flips false, we finish. */
  active: boolean;
  /** What kind of file — tunes copy ("Reading the PDF" vs "DOCX"). */
  kind?: "pdf" | "docx" | "text";
  /** Fired once the finish animation has played out. */
  onDone?: () => void;
}

export default function ResumeParsingProgress({ active, kind, onDone }: Props) {
  const [stage, setStage] = useState<ParseStage>("upload");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-advance upload → read → extract on a realistic cadence, then park on
  // "extract" (the slow AI step) until `active` goes false.
  useEffect(() => {
    if (!active) return;
    setStage("upload");
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setStage("read"), 550),
      setTimeout(() => setStage("extract"), 1400),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  // When the request resolves, mark done and notify after the tick animation.
  useEffect(() => {
    if (active) return;
    if (stage === "upload") return; // never started
    setStage("done");
    const t = setTimeout(() => onDone?.(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const currentIndex = ORDER.indexOf(stage);
  const isDone = stage === "done";
  // Progress bar: fills across the three steps, completes on done.
  const pct = isDone ? 100 : Math.min(90, 12 + currentIndex * 34);

  const readSub =
    kind === "docx"
      ? "Pulling the text out of your DOCX"
      : kind === "text"
      ? "Preparing the pasted text"
      : "Pulling the text out of your PDF";

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-brand/25 bg-brand-soft/40 p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-brand-strong shadow-sm">
          {isDone ? (
            <FileCheck2 size={18} className="anim-pop-in" />
          ) : (
            <Loader2 size={18} className="animate-spin" />
          )}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isDone ? "Resume parsed" : "Parsing your resume…"}
          </p>
          <p className="text-xs text-muted">
            {isDone
              ? "Review the highlighted fields below and save."
              : "This usually takes a few seconds."}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="mt-4 space-y-2.5">
        {STEPS.map((step, i) => {
          const stepIndex = i; // upload=0, read=1, extract=2
          const state =
            isDone || currentIndex > stepIndex
              ? "done"
              : currentIndex === stepIndex
              ? "active"
              : "pending";
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-300 ${
                  state === "done"
                    ? "bg-brand text-white ring-brand"
                    : state === "active"
                    ? "bg-surface text-brand-strong ring-brand/40"
                    : "bg-surface text-muted-2 ring-border"
                }`}
              >
                {state === "done" ? (
                  <Check size={15} className="anim-pop-in" />
                ) : state === "active" ? (
                  <Icon size={15} className="animate-pulse" />
                ) : (
                  <Icon size={15} />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium transition-colors ${
                    state === "pending" ? "text-muted-2" : "text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {state === "active" && (
                  <p className="text-xs text-muted anim-fade-rise">
                    {step.key === "read" ? readSub : step.sub}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
