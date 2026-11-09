import { Check, X } from "lucide-react";

const columns = [
  { title: "REJECTED IF:", icon: X, items: ["Cheap monthly retainers", "Generic email templates", "Lack of call-handling bandwidth"], tone: "text-red-400" },
  { title: "ACCEPTED IF:", icon: Check, items: ["Existing database / lead flow", "Values automated high-end infrastructure", "Wants a revenue systems partner"], tone: "text-cyan-300" },
];

export default function QualificationMatrix() {
  return (
    <section id="criteria" className="border-y border-zinc-900 bg-zinc-950/60">
      <div className="mx-auto max-w-7xl px-5 py-28 lg:px-8">
        <p className="font-mono text-[11px] tracking-[0.2em] text-cyan-300">// 04. SYSTEM FILTERS</p>
        <div className="mt-12 grid border border-zinc-800 md:grid-cols-2">
          {columns.map(({ title, icon: Icon, items, tone }, index) => (
            <div key={title} className={`p-7 sm:p-10 ${index === 0 ? "border-b border-zinc-800 md:border-b-0 md:border-r" : ""}`}>
              <div className={`flex items-center gap-3 font-mono text-sm font-bold tracking-wider ${tone}`}><Icon size={18} /> [{title}]</div>
              <ul className="mt-10 space-y-5">{items.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-zinc-400"><span className="h-px w-4 bg-zinc-700" />{item}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
