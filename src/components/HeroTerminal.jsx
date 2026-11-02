"use client";

import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";

const logs = [
  "[09:41:02] AGENT_04  /  context loaded: 12,842 dormant records",
  "[09:41:04] AGENT_04  /  intent vector mapped: 74 high-probability",
  "[09:41:07] AGENT_04  /  objection model armed: pricing, timing",
  "[09:41:09] AGENT_04  /  outbound sequence initiated...",
];

export default function HeroTerminal() {
  return (
    <section className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-16 px-5 pb-24 pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <div className="mb-7 inline-flex items-center gap-2 border border-cyan-400/30 bg-cyan-400/5 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-cyan-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> [SYSTEM_STATUS: SECURE_CHANNEL]
        </div>
        <h1 className="max-w-3xl text-5xl font-medium leading-[0.96] tracking-[-0.06em] text-zinc-100 sm:text-7xl lg:text-[82px]">
          Your Dead CRM Is <span className="text-cyan-300">Bleeding Revenue.</span> We Built the Machine That Wakes It Up.
        </h1>
        <p className="mt-8 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
          Traditional drip campaigns are dead. We deploy autonomous, hyper-personalized AI operators that interrogate your dormant database, handle objections, and inject high-intent calls directly into your sales calendar.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href="#execute" className="group flex items-center gap-3 bg-cyan-300 px-5 py-3.5 font-mono text-xs font-bold tracking-wide text-zinc-950 transition hover:bg-cyan-200">
            [INITIALIZE_SYSTEM_AUDIT] <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#telemetry" className="flex items-center gap-3 border border-zinc-700 px-5 py-3.5 font-mono text-xs font-bold tracking-wide text-zinc-300 transition hover:border-cyan-400/60 hover:text-cyan-300">
            [VIEW_LIVE_TELEMETRY]
          </a>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.8 }} className="relative">
        <div className="absolute -inset-12 bg-cyan-400/10 blur-3xl" />
        <div className="relative overflow-hidden border border-zinc-700/80 bg-zinc-900/60 shadow-cyan backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 font-mono text-[10px] text-zinc-500">
            <span className="flex items-center gap-2"><Terminal size={12} className="text-cyan-300" /> LIVE_EXECUTION_STREAM</span>
            <span className="text-emerald-300">● CONNECTED</span>
          </div>
          <div className="space-y-5 p-5 font-mono text-[11px] leading-5 sm:p-7">
            <div className="text-zinc-600">root@aivanta-agency:~$ ./wake_database --autonomous</div>
            {logs.map((log, index) => (
              <motion.div key={log} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 + index * 0.45 }} className={index === logs.length - 1 ? "text-cyan-300" : "text-zinc-400"}>
                <span className="mr-2 text-purple-400">→</span>{log}
              </motion.div>
            ))}
            <div className="pt-4 text-zinc-600">root@aivanta-agency:~$ <span className="text-zinc-300">awaiting new signal</span><span className="terminal-caret ml-1 text-cyan-300">▋</span></div>
          </div>
          <div className="grid grid-cols-3 border-t border-zinc-800 bg-zinc-950/60 p-4 font-mono text-[9px] uppercase tracking-wider">
            <div><p className="text-zinc-600">Records</p><p className="mt-1 text-zinc-200">12,842</p></div>
            <div><p className="text-zinc-600">Agents</p><p className="mt-1 text-cyan-300">04 Active</p></div>
            <div><p className="text-zinc-600">Meetings</p><p className="mt-1 text-emerald-300">+27 Today</p></div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
