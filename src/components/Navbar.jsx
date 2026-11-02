"use client";

import { ArrowUpRight, Circle } from "lucide-react";

const links = [
  ["DIAGNOSTIC", "#diagnostic"],
  ["MECHANISM", "#mechanism"],
  ["TELEMETRY", "#telemetry"],
  ["CRITERIA", "#criteria"],
];

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/70 bg-zinc-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#" className="flex items-center gap-3 font-mono text-[11px] font-bold tracking-[0.18em] text-zinc-100">
          <span className="flex h-7 w-7 items-center justify-center rounded border border-cyan-400/50 text-cyan-300 shadow-cyan">A</span>
          AIVANTA<span className="text-cyan-300"> AGENCY</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map(([label, href]) => (
            <a key={label} href={href} className="font-mono text-[10px] tracking-[0.15em] text-zinc-500 transition-colors hover:text-cyan-300">
              // {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 font-mono text-[9px] tracking-wider text-emerald-300 sm:flex">
            <Circle size={7} fill="currentColor" /> SYSTEM_ONLINE // AGENT_V4.2
          </div>
          <a href="#execute" className="group flex items-center gap-2 border border-cyan-400/70 bg-cyan-300 px-3 py-2 font-mono text-[10px] font-bold tracking-wider text-zinc-950 transition hover:bg-cyan-200">
            AUDIT <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
