"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function ConversionTerminal() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("csv");
    try {
      const csvText = file instanceof File && file.size > 0 ? await file.text() : undefined;
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: formData.get("contact"), csvText }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Audit request failed");
      }
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError.message || "Audit request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="execute" className="mx-auto max-w-7xl px-5 py-32 lg:px-8">
      <div className="relative overflow-hidden border border-cyan-400/30 bg-zinc-900/50 px-6 py-14 text-center shadow-cyan backdrop-blur-md sm:px-12">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <p className="font-mono text-[11px] tracking-[0.2em] text-cyan-300">// 05. EXECUTION</p>
        <h2 className="mt-5 text-5xl font-medium tracking-[-0.06em] text-zinc-100 sm:text-7xl">Plug Into the Engine.</h2>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-6 text-zinc-500">Give us a signal. We&apos;ll return a diagnostic of the revenue hiding in your database.</p>
        <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input required name="contact" type="text" placeholder="your-domain.com / email@company.com" className="min-w-0 flex-1 border border-zinc-700 bg-zinc-950 px-4 py-4 font-mono text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400" />
          <label className="cursor-pointer border border-zinc-700 bg-zinc-950 px-4 py-4 font-mono text-[10px] text-zinc-500 transition hover:border-cyan-400/60 hover:text-cyan-300">
            {fileName || "[ATTACH_CSV]"}
            <input name="csv" type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} />
          </label>
          <button disabled={isSubmitting} type="submit" className="group flex items-center justify-center gap-3 bg-cyan-300 px-5 py-4 font-mono text-[10px] font-bold tracking-wider text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-70">
            {submitted ? <><CheckCircle2 size={15} /> SIGNAL_RECEIVED</> : <>{isSubmitting ? "[CONNECTING_TO_ENGINE]" : "[INITIALIZE_SYSTEM_AUDIT]"} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 font-mono text-[10px] tracking-wide text-red-400">{error}</p>}
      </div>
    </section>
  );
}
