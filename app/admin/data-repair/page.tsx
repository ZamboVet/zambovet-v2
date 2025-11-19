"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";

export default function DataRepairPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const repairVeterinarianUserIds = async () => {
    setLoading(true);
    setResults([]);
    const logs: string[] = [];

    try {
      logs.push("Starting veterinarian user_id repair...");

      // Fetch all vets with NULL user_id
      const { data: vetsWithoutUserId, error: fetchErr } = await supabase
        .from("veterinarians")
        .select("id,full_name,user_id")
        .is("user_id", null);

      if (fetchErr) throw fetchErr;

      logs.push(`Found ${vetsWithoutUserId?.length || 0} vets with missing user_id`);

      if (!vetsWithoutUserId || vetsWithoutUserId.length === 0) {
        logs.push("No vets need repair.");
        setResults(logs);
        setLoading(false);
        return;
      }

      // For each vet, try to find their profile by full_name
      let repaired = 0;
      for (const vet of vetsWithoutUserId) {
        try {
          // Try to find profile by full_name (case-insensitive)
          const { data: profiles, error: profileErr } = await supabase
            .from("profiles")
            .select("id")
            .ilike("full_name", vet.full_name)
            .eq("user_role", "veterinarian")
            .limit(1);

          if (profileErr) {
            logs.push(`❌ Vet ${vet.id} (${vet.full_name}): Error fetching profile - ${profileErr.message}`);
            continue;
          }

          if (!profiles || profiles.length === 0) {
            logs.push(`⚠️  Vet ${vet.id} (${vet.full_name}): No matching profile found`);
            continue;
          }

          const userId = profiles[0].id;

          // Update the veterinarian with the user_id
          const { error: updateErr } = await supabase
            .from("veterinarians")
            .update({ user_id: userId })
            .eq("id", vet.id);

          if (updateErr) {
            logs.push(`❌ Vet ${vet.id} (${vet.full_name}): Update failed - ${updateErr.message}`);
            continue;
          }

          logs.push(`✅ Vet ${vet.id} (${vet.full_name}): Updated with user_id ${userId}`);
          repaired++;
        } catch (err: any) {
          logs.push(`❌ Vet ${vet.id} (${vet.full_name}): ${err?.message}`);
        }
      }

      logs.push(`\n✅ Repair complete: ${repaired}/${vetsWithoutUserId.length} vets fixed`);
      setResults(logs);

      await Swal.fire({
        icon: "success",
        title: "Repair Complete",
        text: `Fixed ${repaired} veterinarian records`,
      });
    } catch (err: any) {
      logs.push(`❌ Fatal error: ${err?.message}`);
      setResults(logs);
      await Swal.fire({
        icon: "error",
        title: "Repair Failed",
        text: err?.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Data Repair Utilities</h1>
        <p className="text-gray-600">Fix data inconsistencies in the database</p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Veterinarian User ID Repair</h2>
        <p className="text-sm text-gray-600 mb-4">
          This tool repairs veterinarian records that are missing user_id references. This is needed when vets were created without proper profile linkage.
        </p>
        <button
          onClick={repairVeterinarianUserIds}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Running..." : "Run Repair"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
          {results.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
