"use client";

import Papa from "papaparse";
import { FormEvent, useState } from "react";
import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

type ParsedLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  raw_data: Record<string, unknown>;
};

type CsvRow = Record<string, string>;

const STANDARD_FIELDS = new Set(["name", "email", "phone"]);

function normalizeField(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsv(file: File): Promise<ParsedLead[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeField,
      complete: ({ data, errors }) => {
        if (errors.length > 0) {
          reject(new Error(errors[0].message));
          return;
        }

        resolve(
          data.map((row) => {
            const rawData = Object.fromEntries(
              Object.entries(row).filter(([key]) => !STANDARD_FIELDS.has(key)),
            );

            return {
              name: row.name?.trim() || null,
              email: row.email?.trim() || null,
              phone: row.phone?.trim() || null,
              raw_data: rawData,
            };
          }),
        );
      },
      error: (error) => reject(error),
    });
  });
}

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!file) {
      setStatus("Select a CSV file first.");
      toast.error("Select a CSV file first.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const leads = await parseCsv(file);
      if (leads.length === 0) {
        throw new Error("The CSV does not contain any lead rows.");
      }

      const requestBody = new FormData();
      requestBody.append("medspa_name", String(formData.get("medspa_name") || ""));
      requestBody.append("owner_email", String(formData.get("owner_email") || ""));
      requestBody.append("ghl_api_key", String(formData.get("ghl_api_key") || ""));
      requestBody.append("file", file);
      requestBody.append("leads", JSON.stringify(leads));

      const response = await fetch("/api/ingest", {
        method: "POST",
        body: requestBody,
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Lead ingestion failed.");
      }

      setStatus(`Uploaded ${leads.length} lead${leads.length === 1 ? "" : "s"}.`);
      toast.success(`${leads.length} Leads Processed!`);
      form.reset();
      setFile(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lead ingestion failed.";
      setStatus(message);
      toast.error(message || "Failed to connect to Appwrite");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid max-w-2xl gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 text-zinc-100 shadow-2xl shadow-cyan-950/20"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
          Lead ingestion
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Upload dormant leads</h2>
      </div>
      <input
        required
        name="medspa_name"
        placeholder="MedSpa name"
        className="intake-input"
      />
      <input
        required
        type="email"
        name="owner_email"
        placeholder="Owner email"
        className="intake-input"
      />
      <input
        required
        type="password"
        name="ghl_api_key"
        placeholder="GoHighLevel API key"
        className="intake-input"
      />
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400 transition hover:border-cyan-400/60 hover:text-cyan-300">
        {file ? <FileSpreadsheet size={18} /> : <UploadCloud size={18} />}
        <span>{file ? file.name : "Choose a CSV file"}</span>
        <input
          required
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? "Uploading..." : "Upload leads"}
      </button>
      {status && (
        <p role="status" className="text-sm text-zinc-400">
          {status}
        </p>
      )}
    </form>
  );
}
