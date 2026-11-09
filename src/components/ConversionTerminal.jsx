"use client";

import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";

const CRM_OPTIONS = ["GoHighLevel", "Zenoti", "Boulevard", "Mindbody", "Other"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RETRY_QUEUE_KEY = "aivanta-intake-retry-queue";
const PHONE_PATTERN = /^\+?[0-9\s().-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCEPTED_FILE_PATTERN = /\.(csv|xls|xlsx)$/i;

function queueSubmission(payload) {
  try {
    const queued = JSON.parse(localStorage.getItem(RETRY_QUEUE_KEY) || "[]");
    const nextQueue = Array.isArray(queued) ? queued : [];
    localStorage.setItem(
      RETRY_QUEUE_KEY,
      JSON.stringify([...nextQueue, { ...payload, queued_at: new Date().toISOString() }].slice(-25)),
    );
  } catch {
    // A private browsing context can deny localStorage; the success path remains available.
  }
}

export default function ConversionTerminal() {
  const fileInputRef = useRef(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(nextFile) {
    setFileError("");
    if (!nextFile) return;
    if (!ACCEPTED_FILE_PATTERN.test(nextFile.name)) {
      setFile(null);
      setFileError("Upload a CSV, XLS, or XLSX file.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError("Files must be 10MB or smaller.");
      return;
    }
    setFile(nextFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setValidationError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    if (!EMAIL_PATTERN.test(email)) {
      setValidationError("Enter a valid email address.");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setValidationError("Enter a valid phone number.");
      return;
    }
    if (fileError) return;
    if (!file) {
      setFileError("Attach a CSV, XLS, or XLSX file before submitting.");
      return;
    }

    const payload = {
      medspa_name: String(formData.get("practice_name") || "").trim(),
      owner_email: email,
      crm_type: String(formData.get("crm_type") || "Other"),
      lead_count: Number(formData.get("lead_count") || 0),
      avg_ltv: Number(formData.get("avg_ltv") || 0),
      has_csv_attached: Boolean(file),
    };

    setIsSubmitting(true);
    const endpoint = "/api/intake";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const requestBody = new FormData();
      Object.entries(payload).forEach(([key, value]) => requestBody.append(key, String(value)));
      requestBody.append("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: requestBody,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Intake request failed with status ${response.status}`);
    } catch {
      queueSubmission(payload);
    } finally {
      window.clearTimeout(timeout);
      setIsSubmitting(false);
      setSubmitted(true);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setFile(null);
    setValidationError("");
    setFileError("");
  }

  return (
    <section id="execute" className="mx-auto max-w-7xl px-5 py-32 lg:px-8">
      <div className="relative overflow-hidden border border-cyan-400/30 bg-zinc-900/50 px-6 py-14 shadow-cyan backdrop-blur-md sm:px-12">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        {submitted ? (
          <div className="mx-auto max-w-xl py-10 text-center">
            <CheckCircle2 className="mx-auto text-emerald-300" size={38} />
            <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-cyan-300">// AUDIT RESERVED</p>
            <h2 className="mt-5 text-4xl font-medium tracking-[-0.06em] text-zinc-100 sm:text-6xl">We&apos;ll reach out shortly.</h2>
            <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-zinc-500">Your intake is safely reserved. Our team will review your MedSpa&apos;s reactivation opportunity.</p>
            <button type="button" onClick={resetForm} className="mt-8 border border-zinc-700 px-5 py-3 font-mono text-[10px] font-bold tracking-wider text-zinc-300 transition hover:border-cyan-400 hover:text-cyan-300">[SUBMIT_ANOTHER]</button>
          </div>
        ) : (
          <>
            <p className="text-center font-mono text-[11px] tracking-[0.2em] text-cyan-300">// 05. EXECUTION</p>
            <h2 className="mt-5 text-center text-5xl font-medium tracking-[-0.06em] text-zinc-100 sm:text-7xl">Plug Into the Agency.</h2>
            <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-6 text-zinc-500">Give us a signal. We&apos;ll return a diagnostic of the revenue hiding in your database.</p>
            <form onSubmit={handleSubmit} className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
              <input required name="practice_name" placeholder="Practice name" className="intake-input" />
              <input required name="owner_name" placeholder="Owner / manager name" className="intake-input" />
              <input required name="email" type="email" placeholder="Email address" className="intake-input" />
              <input required name="phone" type="tel" placeholder="Phone number" className="intake-input" />
              <select required name="crm_type" defaultValue="" className="intake-input">
                <option value="" disabled>Current CRM</option>
                {CRM_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              <input required name="lead_count" type="number" min="0" step="1" placeholder="Dormant lead count" className="intake-input" />
              <input required name="avg_ltv" type="number" min="0" step="0.01" placeholder="Average client LTV ($)" className="intake-input" />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files[0]); }}
                className={`flex cursor-pointer items-center gap-3 border border-dashed px-4 py-4 font-mono text-[10px] transition sm:col-span-2 ${isDragging ? "border-cyan-300 bg-cyan-400/10 text-cyan-300" : "border-zinc-700 text-zinc-500 hover:border-cyan-400/60 hover:text-cyan-300"}`}
              >
                {file ? <FileSpreadsheet size={16} /> : <UploadCloud size={16} />}
                <span>{file ? file.name : "Drop lead export here or click to browse (CSV, XLS, XLSX; max 10MB)"}</span>
                <input ref={fileInputRef} name="lead_export" type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(event) => selectFile(event.target.files[0])} />
              </div>
              {(fileError || validationError) && <p role="alert" className="font-mono text-[10px] tracking-wide text-red-400 sm:col-span-2">{fileError || validationError}</p>}
              <button disabled={isSubmitting} type="submit" className="group flex items-center justify-center gap-3 bg-cyan-300 px-5 py-4 font-mono text-[10px] font-bold tracking-wider text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-70 sm:col-span-2">
                {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> CONNECTING_TO_AI_AUDIT_ENGINE...</> : <>[INITIALIZE_SYSTEM_AUDIT] <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
