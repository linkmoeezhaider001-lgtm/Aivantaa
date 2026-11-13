"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function CsvUploader() {
  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState(0);

  const BATCH_SIZE = 50;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("Parsing CSV in browser...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const records = results.data;
        setStatus(`Parsed ${records.length} rows. Preparing batches...`);
        
        // 1. Format the data and pack extra columns into metadata
        const formattedRecords = records.map((record: any) => {
          const { 
            Name, Email, Phone, CRM, average_ltv, dormant_leads_count, 
            ...extraFields 
          } = record;

          return {
            Name: Name || "",
            Email: Email || "",
            Phone: Phone || "",
            CRM: CRM || "",
            average_ltv: parseFloat(average_ltv) || 0,
            dormant_leads_count: parseInt(dormant_leads_count, 10) || 0,
            metadata: JSON.stringify(extraFields || {})
          };
        });

        // 2. Chunk into batches of 50 to avoid Vercel timeouts
        const batches = [];
        for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
          batches.push(formattedRecords.slice(i, i + BATCH_SIZE));
        }

        // 3. Send batches sequentially
        let successCount = 0;
        for (let i = 0; i < batches.length; i++) {
          setStatus(`Uploading batch ${i + 1} of ${batches.length}...`);
          setProgress(Math.round(((i + 1) / batches.length) * 100));

          try {
            const res = await fetch("/api/intake", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: batches[i] }),
            });

            if (!res.ok) throw new Error(`Batch ${i + 1} failed`);
            successCount += batches[i].length;
          } catch (error) {
            console.error(error);
            setStatus(`Error on batch ${i + 1}. Upload paused.`);
            return;
          }
        }

        setStatus(`Success! Uploaded ${successCount} leads into Appwrite.`);
      }
    });
  };

  return (
    <div className="p-4 border rounded-md shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Upload Client CSV</h2>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
        className="mb-4"
      />
      <div className="mt-2 text-sm font-medium text-gray-700">{status}</div>
      
      {/* Simple Progress Bar */}
      {progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}