import { Database, MessageSquare, Zap } from "lucide-react";

const phases = [
  ["PHASE_01 // INGESTION", "CRM sync, historical data cleaning, vector embedding intent segmentation.", Database],
  ["PHASE_02 // EXECUTION", "Multi-channel autonomous SMS/email touchpoints referencing past timelines.", MessageSquare],
  ["PHASE_03 // CONVERSION", "Autonomous objection handling and instant calendar meeting sync.", Zap],
];

export default function MechanismEngine() {
  return (
    <section id="mechanism" className="border-y border-zinc-900 bg-zinc-950/60">
      <div className="mx-auto max-w-7xl px-5 py-28 lg:px-8">
        <p className="font-mono text-[11px] tracking-[0.2em] text-cyan-300">// 02. THE REACTION AGENCY</p>
        <h2 className="mt-5 max-w-3xl text-4xl font-medium tracking-[-0.05em] text-zinc-100 sm:text-6xl">Precision AI Tailored to Your Pipeline Infrastructure.</h2>
        <div className="mt-14 grid gap-px border border-zinc-800 bg-zinc-800 md:grid-cols-3">
          {phases.map(([title, copy, Icon], index) => (
            <div key={title} className="bg-zinc-950 p-7 transition-colors hover:bg-zinc-900">
              <div className="flex items-center justify-between"><Icon size={20} className="text-cyan-300" /><span className="font-mono text-[10px] text-zinc-600">0{index + 1} / 03</span></div>
              <p className="mt-14 font-mono text-xs font-bold tracking-wider text-zinc-200">{title}</p>
              <p className="mt-4 text-sm leading-6 text-zinc-500">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
