const metrics = [
  ["+340%", "Average increase in dead-lead reply rates within 14 days"],
  ["$42.5K", "Recovered pipeline revenue per 5,000 dormant contacts"],
  ["0 hrs", "Manual labor required from internal sales team"],
];

export default function TelemetryMetrics() {
  return (
    <section id="telemetry" className="mx-auto max-w-7xl px-5 py-28 lg:px-8">
      <p className="font-mono text-[11px] tracking-[0.2em] text-cyan-300">// 03. SYSTEM TELEMETRY</p>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {metrics.map(([value, label]) => (
          <div key={value} className="border border-zinc-800/80 bg-zinc-900/40 p-7 backdrop-blur-md transition hover:border-cyan-500/50">
            <p className="text-6xl font-medium tracking-[-0.07em] text-zinc-100">{value}</p>
            <p className="mt-8 max-w-[220px] font-mono text-[10px] uppercase leading-5 tracking-wider text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
