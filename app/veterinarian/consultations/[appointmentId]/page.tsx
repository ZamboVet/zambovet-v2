"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getCurrentVet } from "../../../../lib/utils/currentVet";
import Swal from "sweetalert2";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400","500","600","700"] });
const PRIMARY = "#2563eb";

type Appointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  patient_id: number | null;
  pet_owner_id: number | null;
  veterinarian_id: number | null;
  clinic_id: number | null;
  reason_for_visit: string | null;
};

type Consultation = {
  id: number;
  appointment_id: number;
  veterinarian_id: number;
  patient_id: number;
  clinic_id: number | null;
  status: string;
  chief_complaint: string | null;
  soap_subjective: string | null;
  soap_objective: string | null;
  soap_assessment: string | null;
  soap_plan: string | null;
};

type Vital = { id: number; measured_at: string | null; weight: number | null; temperature: number | null; heart_rate: number | null; notes: string | null };
type Dx = { id: number; diagnosis_text: string; notes: string | null };
type Rx = { id: number; medication_name: string; dosage: string | null; duration: string | null; instructions: string | null };
type PrescriptionFormItem = { name: string; dosage_value: string; dosage_unit: 'mg' | 'g'; duration: string; instr: string };
// Labs removed

export default function ConsultationPage() {
  const params = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const apptId = Number(params.appointmentId);

  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [consult, setConsult] = useState<Consultation | null>(null);

  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");

  const [vitals, setVitals] = useState<Vital[]>([]);
  const [diagnoses, setDiagnoses] = useState<Dx[]>([]);
  const [prescriptions, setPrescriptions] = useState<Rx[]>([]);
  
  const [vitalsSupported, setVitalsSupported] = useState(true);
  const [diagnosesSupported, setDiagnosesSupported] = useState(true);
  const [prescriptionsSupported, setPrescriptionsSupported] = useState(true);
  
  // Unified form state
  const [vitalsForm, setVitalsForm] = useState<{ weight: string; temperature: string; heart_rate: string; notes: string }>({ weight: "", temperature: "", heart_rate: "", notes: "" });
  const [diagnosesForm, setDiagnosesForm] = useState<Array<{ text: string; notes: string }>>([{ text: "", notes: "" }]);
  const [prescriptionsForm, setPrescriptionsForm] = useState<PrescriptionFormItem[]>([{ name: "", dosage_value: "", dosage_unit: 'mg', duration: "", instr: "" }]);


  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Ensure this appointment belongs to the logged-in veterinarian
        const { vet } = await getCurrentVet();
        if (!vet) {
          await Swal.fire({ icon: 'info', title: 'Application pending', text: 'Your veterinarian profile is not active yet.' });
          router.push('/veterinarian');
          return;
        }
        // Load appointment
        const { data: a, error: aErr } = await supabase
          .from("appointments")
          .select("id,appointment_date,appointment_time,patient_id,pet_owner_id,veterinarian_id,clinic_id,reason_for_visit,status")
          .eq("id", apptId)
          .maybeSingle();
        if (aErr) throw aErr;
        if (!a) {
          await Swal.fire({ icon: "error", title: "Not found", text: "Appointment was not found." });
          router.push("/veterinarian/appointments");
          return;
        }
        if ((a as any).veterinarian_id !== vet.id) {
          await Swal.fire({ icon: 'error', title: 'Access denied', text: 'This appointment does not belong to your account.' });
          router.push('/veterinarian/appointments');
          return;
        }
        setAppointment(a as any);

        // Try to get or create consultation
        try {
          let { data: existing, error: qErr } = await supabase
            .from("consultations")
            .select("id,appointment_id,veterinarian_id,patient_id,clinic_id,status,chief_complaint,soap_subjective,soap_objective,soap_assessment,soap_plan")
            .eq("appointment_id", apptId)
            .maybeSingle();
          if (qErr && (qErr as any).code !== "PGRST116") throw qErr;
          if (!existing) {
            if (!a.veterinarian_id || !a.patient_id) {
              await Swal.fire({ icon: "warning", title: "Missing data", text: "Appointment is missing vet or patient." });
              return;
            }
            const { data: created, error: cErr } = await supabase
              .from("consultations")
              .insert({
                appointment_id: apptId,
                veterinarian_id: a.veterinarian_id,
                patient_id: a.patient_id,
                clinic_id: a.clinic_id,
                status: "in_progress",
                chief_complaint: a.reason_for_visit || null,
              })
              .select("id,appointment_id,veterinarian_id,patient_id,clinic_id,status,chief_complaint,soap_subjective,soap_objective,soap_assessment,soap_plan")
              .single();
            if (cErr) throw cErr;
            existing = created as any;
          }
          if (existing) {
            setConsult(existing as any);
            setSubjective(existing.soap_subjective || "");
            setObjective(existing.soap_objective || "");
            setAssessment(existing.soap_assessment || "");
            setPlan(existing.soap_plan || "");
            // fetch related resources
            try {
              const { data: vs } = await supabase.from("consultation_vitals").select("id,measured_at,weight,temperature,heart_rate,notes").eq("consultation_id", (existing as any).id).order("measured_at", { ascending: false });
              setVitals((vs || []) as Vital[]);
            } catch { setVitalsSupported(false); }
            try {
              const { data: dxs } = await supabase.from("consultation_diagnoses").select("id,diagnosis_text,notes").eq("consultation_id", (existing as any).id).order("id", { ascending: false });
              setDiagnoses((dxs || []) as Dx[]);
            } catch { setDiagnosesSupported(false); }
            try {
              const { data: rxs } = await supabase.from("consultation_prescriptions").select("id,medication_name,dosage,duration,instructions").eq("consultation_id", (existing as any).id).order("id", { ascending: false });
              setPrescriptions((rxs || []) as Rx[]);
            } catch { setPrescriptionsSupported(false); }
            // Prefill unified forms
            try {
              const latest = (vitals || []).at(0) as any;
              if (latest) setVitalsForm({
                weight: latest.weight != null ? String(latest.weight) : "",
                temperature: latest.temperature != null ? String(latest.temperature) : "",
                heart_rate: latest.heart_rate != null ? String(latest.heart_rate) : "",
                notes: latest.notes || ""
              });
            } catch {}
            try {
              const dxf = (diagnoses || []).map(d => ({ text: (d as any).diagnosis_text, notes: (d as any).notes || "" }));
              setDiagnosesForm(dxf.length ? dxf : [{ text: "", notes: "" }]);
            } catch {}
            try {
              const rxf = (prescriptions || []).map(r => {
                const dosageStr = (r as any).dosage || "";
                const unit: PrescriptionFormItem['dosage_unit'] = /\bg\b/i.test(dosageStr) ? 'g' : 'mg';
                const dosage_value = dosageStr.replace(/\s*(mg|g)\s*$/i, '').trim();
                return { name: (r as any).medication_name, dosage_value, dosage_unit: unit, duration: (r as any).duration || "", instr: (r as any).instructions || "" } as PrescriptionFormItem;
              });
              setPrescriptionsForm(rxf.length ? rxf : [{ name: "", dosage_value: "", dosage_unit: 'mg', duration: "", instr: "" }]);
            } catch {}
          }
        } catch (e: any) {
          // Table might not exist yet
          setSupported(false);
          // Suppress modal; show inline banner only
          console.warn('Consultation model not provisioned:', e?.message || e);
        }
      } catch (err: any) {
        // Suppress modal on load errors as well; show inline banner instead
        setSupported(false);
        console.warn('Consultation load error:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    if (!Number.isNaN(apptId)) init();
  }, [apptId]);

  const save = async (complete = false) => {
    if (!consult) return;
    try {
      // Update consultation status only
      const { error: upErr } = await supabase
        .from("consultations")
        .update({ status: complete ? "completed" : "in_progress" })
        .eq("id", consult.id);
      if (upErr) throw upErr;

      // Insert latest vitals if any filled
      const hasVitals = !!(vitalsForm.weight || vitalsForm.temperature || vitalsForm.heart_rate || vitalsForm.notes);
      if (hasVitals) {
        await supabase.from("consultation_vitals").insert({
          consultation_id: consult.id,
          weight: vitalsForm.weight ? Number(vitalsForm.weight) : null,
          temperature: vitalsForm.temperature ? Number(vitalsForm.temperature) : null,
          heart_rate: vitalsForm.heart_rate ? Number(vitalsForm.heart_rate) : null,
          notes: vitalsForm.notes || null,
        });
      }

      // Replace diagnoses with current form entries
      if (diagnosesSupported) {
        await supabase.from("consultation_diagnoses").delete().eq("consultation_id", consult.id);
        const dInserts = diagnosesForm.filter(d => d.text.trim()).map(d => ({ consultation_id: consult.id, diagnosis_text: d.text.trim(), notes: d.notes || null }));
        if (dInserts.length) await supabase.from("consultation_diagnoses").insert(dInserts);
      }

      // Replace prescriptions with current form entries
      if (prescriptionsSupported) {
        await supabase.from("consultation_prescriptions").delete().eq("consultation_id", consult.id);
        const rInserts = prescriptionsForm.filter(r => r.name.trim()).map(r => {
          const dosage = r.dosage_value ? `${r.dosage_value} ${r.dosage_unit}` : null;
          return { consultation_id: consult.id, medication_name: r.name.trim(), dosage, duration: r.duration || null, instructions: r.instr || null };
        });
        if (rInserts.length) await supabase.from("consultation_prescriptions").insert(rInserts);
      }

      if (complete) {
        await supabase.from("appointments").update({ status: "completed" }).eq("id", apptId);
        try {
          const ownerId = (appointment as any)?.pet_owner_id as number | null;
          if (ownerId) {
            const { data: owner } = await supabase.from('pet_owner_profiles').select('user_id, full_name').eq('id', ownerId).maybeSingle();
            const user_id = (owner as any)?.user_id || null;
            await supabase.from('notifications').insert({
              user_id,
              title: 'Consultation completed',
              message: `Consultation for appointment #${apptId} has been completed.`,
              notification_type: 'system',
              related_appointment_id: apptId,
            });
          }
        } catch {}
      }

      await Swal.fire({ icon: "success", title: complete ? "Consultation completed" : "Saved" });
      // refresh lists
      setVitals([]); setDiagnoses([]); setPrescriptions([]);
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Save failed", text: e?.message || "Please try again." });
    }
  };

  // CRUD helpers
  const addVital = async () => {
    if (!consult) return;
    try {
      const { value: form, isConfirmed } = await Swal.fire<{ weight: string; temp: string; hr: string; notes: string }>({
        title: "Add Vitals",
        html: `
          <div class='text-left font-[Poppins]'>
            <div class='grid sm:grid-cols-2 gap-3'>
              <div>
                <label class='text-[11px] text-gray-500'>Weight (kg)</label>
                <input id='w' type='number' step='0.01' placeholder='e.g., 4.20' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none" />
              </div>
              <div>
                <label class='text-[11px] text-gray-500'>Temperature (°C)</label>
                <input id='t' type='number' step='0.1' placeholder='e.g., 38.5' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none" />
              </div>
              <div>
                <label class='text-[11px] text-gray-500'>Heart rate (bpm)</label>
                <input id='hr' type='number' placeholder='e.g., 90' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none" />
              </div>
            </div>
            <div class='mt-2'>
              <label class='text-[11px] text-gray-500'>Notes</label>
              <input id='n' type='text' placeholder='Optional notes' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none" />
            </div>
          </div>
        `,
        width: 560,
        showCancelButton: true,
        confirmButtonText: 'Add',
        customClass: {
          confirmButton: 'swal2-confirm btn-primary',
          cancelButton: 'swal2-cancel btn-secondary',
          popup: 'font-[Poppins]'
        },
        focusConfirm: false,
        preConfirm: () => {
          const weight = (document.getElementById('w') as HTMLInputElement)?.value;
          const temp = (document.getElementById('t') as HTMLInputElement)?.value;
          const hr = (document.getElementById('hr') as HTMLInputElement)?.value;
          const notes = (document.getElementById('n') as HTMLInputElement)?.value;
          if (!weight && !temp && !hr && !notes) { Swal.showValidationMessage('Enter at least one vital field.'); return; }
          return { weight, temp, hr, notes };
        }
      });
      if (!isConfirmed || !form) return;
      const { data, error } = await supabase.from("consultation_vitals").insert({ consultation_id: consult.id, weight: form.weight ? Number(form.weight) : null, temperature: form.temp ? Number(form.temp) : null, heart_rate: form.hr ? Number(form.hr) : null, notes: form.notes || null }).select("id,measured_at,weight,temperature,heart_rate,notes").single();
      if (error) throw error;
      setVitals(v => [data as any, ...v]);
    } catch (e:any) {
      await Swal.fire({ icon: 'error', title: 'Failed to add vitals', text: e?.message || 'Try again.' });
    }
  };

  const addDiagnosis = async () => {
    if (!consult) return;
    try {
      const { value: form, isConfirmed } = await Swal.fire<{ text: string; notes: string }>({
        title: "Add Diagnosis",
        html: `
          <div class='text-left font-[Poppins]'>
            <div>
              <label class='text-[11px] text-gray-500'>Diagnosis</label>
              <input id='dx' type='text' placeholder='e.g., Otitis externa' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none"/>
            </div>
            <div class='mt-2'>
              <label class='text-[11px] text-gray-500'>Notes</label>
              <input id='dxn' type='text' placeholder='Optional notes' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none"/>
            </div>
          </div>
        `,
        width: 560,
        showCancelButton: true,
        confirmButtonText: 'Add',
        customClass: {
          confirmButton: 'swal2-confirm btn-primary',
          cancelButton: 'swal2-cancel btn-secondary',
          popup: 'font-[Poppins]'
        },
        focusConfirm: false,
        preConfirm: () => {
          const text = (document.getElementById('dx') as HTMLInputElement)?.value;
          const notes = (document.getElementById('dxn') as HTMLInputElement)?.value;
          if (!text) { Swal.showValidationMessage('Diagnosis required'); return; }
          return { text, notes };
        }
      });
      if (!isConfirmed || !form) return;
      const { data, error } = await supabase.from("consultation_diagnoses").insert({ consultation_id: consult.id, diagnosis_text: form.text, notes: form.notes || null }).select("id,diagnosis_text,notes").single();
      if (error) throw error;
      setDiagnoses(dx => [data as any, ...dx]);
    } catch (e:any) {
      await Swal.fire({ icon: 'error', title: 'Failed to add diagnosis', text: e?.message || 'Try again.' });
    }
  };

  const addPrescription = async () => {
    if (!consult) return;
    try {
      const { value: form, isConfirmed } = await Swal.fire<{ name: string; dosage_value: string; dosage_unit: string; dur: string; instr: string }>({
        title: "Add Prescription",
        html: `
          <div class='text-left font-[Poppins]'>
            <div>
              <label class='text-[11px] text-gray-500'>Medication name</label>
              <input id='rxn' type='text' placeholder='e.g., Amoxicillin' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none"/>
            </div>
            <div class='mt-3'>
              <label class='text-[11px] text-gray-500 block mb-2'>Dosage</label>
              <div class='grid sm:grid-cols-2 gap-3'>
                <input id='rxd' type='number' placeholder='e.g., 10' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none"/>
                <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                    <input type='radio' name='unit' value='mg' checked style="cursor:pointer"/> mg
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                    <input type='radio' name='unit' value='g' style="cursor:pointer"/> g
                  </label>
                </div>
              </div>
            </div>
            <div class='grid sm:grid-cols-2 gap-3 mt-3'>
              <div>
                <label class='text-[11px] text-gray-500'>Duration</label>
                <input id='rxt' type='text' placeholder='e.g., 7 days' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none"/>
              </div>
            </div>
            <div class='mt-3'>
              <label class='text-[11px] text-gray-500'>Instructions</label>
              <input id='rxi' type='text' placeholder='Optional instructions for owner' style="width:100%;padding:10px 12px;border:1px solid #E5E7EB;border-radius:10px;outline:none"/>
            </div>
          </div>
        `,
        width: 560,
        showCancelButton: true,
        confirmButtonText: 'Add',
        customClass: {
          confirmButton: 'swal2-confirm btn-primary',
          cancelButton: 'swal2-cancel btn-secondary',
          popup: 'font-[Poppins]'
        },
        focusConfirm: false,
        preConfirm: () => {
          const name = (document.getElementById('rxn') as HTMLInputElement)?.value;
          const dosage_value = (document.getElementById('rxd') as HTMLInputElement)?.value;
          const dosage_unit = (document.querySelector('input[name="unit"]:checked') as HTMLInputElement)?.value || 'mg';
          const dur = (document.getElementById('rxt') as HTMLInputElement)?.value;
          const instr = (document.getElementById('rxi') as HTMLInputElement)?.value;
          if (!name) { Swal.showValidationMessage('Medication name required'); return; }
          return { name, dosage_value, dosage_unit, dur, instr };
        }
      });
      if (!isConfirmed || !form) return;
      const dosage = form.dosage_value ? `${form.dosage_value} ${form.dosage_unit}` : null;
      const { data, error } = await supabase.from("consultation_prescriptions").insert({ consultation_id: consult.id, medication_name: form.name, dosage, duration: form.dur || null, instructions: form.instr || null }).select("id,medication_name,dosage,duration,instructions").single();
      if (error) throw error;
      setPrescriptions(rx => [data as any, ...rx]);
    } catch (e:any) {
      await Swal.fire({ icon: 'error', title: 'Failed to add prescription', text: e?.message || 'Try again.' });
    }
  };

  // Labs removed

  return (
    <div className={`${poppins.className} space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Consultation</h1>
          {appointment && (
            <div className="text-sm text-gray-500">Appt #{appointment.id} • {appointment.appointment_date} • {appointment.appointment_time}</div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button onClick={() => save(false)} disabled={!supported || loading} className="px-4 py-2 rounded-xl bg-white ring-1 ring-gray-200 hover:bg-gray-50 w-full sm:w-auto">Save</button>
          <button onClick={() => save(true)} disabled={!supported || loading} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto">Complete</button>
        </div>
      </div>

      {!supported ? (
        <div className="rounded-2xl bg-white/80 backdrop-blur p-5 ring-1 ring-gray-100">
          <div className="text-sm text-gray-600">Consultation features are not available. Please add the consultations tables first.</div>
        </div>
      ) : loading ? (
        <div className="rounded-2xl bg-white/80 backdrop-blur p-5 ring-1 ring-gray-100 text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white/80 backdrop-blur p-5 ring-1 ring-gray-100 space-y-4">
              <div className="text-lg font-semibold" style={{ color: PRIMARY }}>Vitals</div>
              {!vitalsSupported ? (
                <div className="text-sm text-gray-600">Vitals table not available.</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500">Weight (kg)</label>
                    <input value={vitalsForm.weight} onChange={e=>setVitalsForm(v=>({...v, weight:e.target.value}))} type="number" step="0.01" placeholder="e.g., 4.20" className="w-full px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Temperature (°C)</label>
                    <input value={vitalsForm.temperature} onChange={e=>setVitalsForm(v=>({...v, temperature:e.target.value}))} type="number" step="0.1" placeholder="e.g., 38.5" className="w-full px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Heart rate (bpm)</label>
                    <input value={vitalsForm.heart_rate} onChange={e=>setVitalsForm(v=>({...v, heart_rate:e.target.value}))} type="number" placeholder="e.g., 90" className="w-full px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Notes</label>
                    <input value={vitalsForm.notes} onChange={e=>setVitalsForm(v=>({...v, notes:e.target.value}))} placeholder="Optional notes" className="w-full px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur p-5 ring-1 ring-gray-100 shadow-sm overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold" style={{ color: PRIMARY }}>Diagnoses</div>
                <button onClick={()=>setDiagnosesForm(f=>[...f,{ text:"", notes:"" }])} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm">Add</button>
              </div>
              {!diagnosesSupported ? (
                <div className="text-sm text-gray-600">Diagnoses table not available.</div>
              ) : (
                <div className="space-y-2">
                  {diagnosesForm.map((d, i)=> (
                    <div key={i} className="grid sm:grid-cols-2 gap-2 min-w-0">
                      <input value={d.text} onChange={e=>setDiagnosesForm(arr=> arr.map((x,idx)=> idx===i?{...x, text:e.target.value}:x))} placeholder="Diagnosis" className="w-full min-w-0 px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                      <div className="flex gap-2 min-w-0">
                        <input value={d.notes} onChange={e=>setDiagnosesForm(arr=> arr.map((x,idx)=> idx===i?{...x, notes:e.target.value}:x))} placeholder="Notes" className="flex-1 min-w-0 px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                        <button onClick={()=> setDiagnosesForm(arr=> arr.filter((_,idx)=> idx!==i))} className="px-3 py-2 rounded-xl ring-1 ring-gray-200">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur p-5 ring-1 ring-gray-100 shadow-sm overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold" style={{ color: PRIMARY }}>Prescriptions</div>
                <button onClick={()=>setPrescriptionsForm(f=>[...f,{ name:"", dosage_value:"", dosage_unit:'mg', duration:"", instr:"" }])} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm">Add</button>
              </div>
              {!prescriptionsSupported ? (
                <div className="text-sm text-gray-600">Prescriptions table not available.</div>
              ) : (
                <div className="space-y-2">
                  {prescriptionsForm.map((r, i)=> (
                    <div key={i} className="space-y-2 min-w-0 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="grid sm:grid-cols-2 gap-2 min-w-0">
                        <input value={r.name} onChange={e=>setPrescriptionsForm(arr=> arr.map((x,idx)=> idx===i?{...x, name:e.target.value}:x))} placeholder="Medication name" className="w-full min-w-0 px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                        <input value={r.duration} onChange={e=>setPrescriptionsForm(arr=> arr.map((x,idx)=> idx===i?{...x, duration:e.target.value}:x))} placeholder="Duration" className="flex-1 min-w-0 px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                      </div>
                      <div className="flex gap-2 items-end min-w-0">
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] text-gray-500 block mb-1">Dosage</label>
                          <input value={r.dosage_value} onChange={e=>setPrescriptionsForm(arr=> arr.map((x,idx)=> idx===i?{...x, dosage_value:e.target.value}:x))} type="number" placeholder="e.g., 10" className="w-full min-w-0 px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input type="radio" checked={r.dosage_unit === 'mg'} onChange={()=>setPrescriptionsForm(arr=> arr.map((x,idx)=> idx===i?{...x, dosage_unit:'mg'}:x))}/>
                            <span>mg</span>
                          </label>
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input type="radio" checked={r.dosage_unit === 'g'} onChange={()=>setPrescriptionsForm(arr=> arr.map((x,idx)=> idx===i?{...x, dosage_unit:'g'}:x))}/>
                            <span>g</span>
                          </label>
                        </div>
                        <button onClick={()=> setPrescriptionsForm(arr=> arr.filter((_,idx)=> idx!==i))} className="px-3 py-2 rounded-xl ring-1 ring-gray-200">Remove</button>
                      </div>
                      <input value={r.instr} onChange={e=>setPrescriptionsForm(arr=> arr.map((x,idx)=> idx===i?{...x, instr:e.target.value}:x))} placeholder="Instructions" className="w-full min-w-0 px-3 py-2 rounded-xl ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur p-6 ring-1 ring-gray-100 space-y-5">
            <div className="text-lg font-semibold" style={{ color: PRIMARY }}>Consultation Preview</div>
            <div className="space-y-6 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-2">Vitals</div>
                <div className="rounded-2xl ring-1 ring-gray-100 p-4 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <span className="text-gray-500">Weight</span>
                      <span className="font-medium text-gray-800">{vitalsForm.weight ? `${vitalsForm.weight} kg` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <span className="text-gray-500">Temperature</span>
                      <span className="font-medium text-gray-800">{vitalsForm.temperature ? `${vitalsForm.temperature} °C` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <span className="text-gray-500">Heart rate</span>
                      <span className="font-medium text-gray-800">{vitalsForm.heart_rate ? `${vitalsForm.heart_rate} bpm` : '—'}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Notes</div>
                    <div className="rounded-xl bg-gray-50 p-3 text-gray-700">{vitalsForm.notes || '—'}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Diagnoses</div>
                <ul className="space-y-2">
                  {diagnosesForm.filter(d=>d.text.trim()).length === 0 ? (
                    <li className="rounded-2xl ring-1 ring-gray-100 p-4 bg-white">—</li>
                  ) : (
                    diagnosesForm.filter(d=>d.text.trim()).map((d,i)=> (
                      <li key={i} className="rounded-2xl ring-1 ring-gray-100 p-4 bg-white">
                        <div className="font-semibold" style={{ color: PRIMARY }}>Diagnosis {i+1}</div>
                        <div className="mt-1 text-gray-900">{d.text}</div>
                        <div className="mt-1 text-gray-500 text-xs">Notes</div>
                        <div className="text-gray-700">{d.notes || '—'}</div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Prescriptions</div>
                <ul className="space-y-2">
                  {prescriptionsForm.filter(r=>r.name.trim()).length === 0 ? (
                    <li className="rounded-2xl ring-1 ring-gray-100 p-4 bg-white">—</li>
                  ) : (
                    prescriptionsForm.filter(r=>r.name.trim()).map((r,i)=> (
                      <li key={i} className="rounded-2xl ring-1 ring-gray-100 p-4 bg-white space-y-1">
                        <div className="font-semibold" style={{ color: PRIMARY }}>Prescription {i+1}</div>
                        <div className="text-gray-900">{r.name}</div>
                        <div className="grid sm:grid-cols-2 gap-2">
                        <div className="rounded-xl bg-gray-50 p-3 flex items-center justify-between">
                            <span className="text-gray-500">Dosage</span>
                            <span className="text-gray-800 font-medium">{r.dosage_value ? `${r.dosage_value} ${r.dosage_unit}` : '—'}</span>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3 flex items-center justify-between">
                            <span className="text-gray-500">Duration</span>
                            <span className="text-gray-800 font-medium">{r.duration || '—'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">Instructions</div>
                          <div className="text-gray-700">{r.instr || '—'}</div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
}
    </div>
  );
}
