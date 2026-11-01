import { AlertTriangle } from "lucide-react";

const problems = [
  ["ERROR_01: STORAGE_DRAIN", "Thousands spent on leads that bought once and vanished, sitting in CRM dead storage while paying monthly fees."],
  ["ERROR_02: HUMAN_BOTTLENECK", "Sales reps chasing low-intent clicks instead of warm conversations. Manual sequences lack real-time context."],
  ["ERROR_03: BLIND_OUTREACH", "Generic discount emails hitting spam filters. Modern buyers expect custom context."],
];

export default function ProblemDiagnostic() {
  return (
    <section id="diagnostic" className="mx-auto max-w-7xl px-5 py-28 lg:px-8">
      <p className="font-mono text-[11px] tracking-[0.2em] text-cyan-300">// 01. DIAGNOSTIC REPORT</p>
      <h2 className="mt-5 max-w-2xl text-4xl font-medium tracking-[-0.05em] text-zinc-100 sm:text-6xl">80% of Your Database Has Gone Dark.</h2>
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {problems.map(([tag, copy], index) => (
          <article key={tag} className={`group border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md transition-all hover:border-cyan-500/50 ${index === 1 ? "md:translate-y-8" : ""}`}>
            <AlertTriangle size={18} className="text-purple-400 transition-colors group-hover:text-cyan-300" />
            <p className="mt-12 font-mono text-[10px] tracking-wider text-cyan-300">[{tag}]</p>
            <p className="mt-5 text-sm leading-6 text-zinc-400">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
