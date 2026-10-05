import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEMO_PASSWORD = "Demo@12345";

const DOCTORS = [
  { email: "dr.bilal@demo-hospital.pk", name: "Dr. Bilal Ahmed", dept: "General Medicine", spec: "Internal Medicine, MBBS FCPS" },
  { email: "dr.ayesha@demo-hospital.pk", name: "Dr. Ayesha Khan", dept: "Pediatrics", spec: "Consultant Pediatrician" },
  { email: "dr.tariq@demo-hospital.pk", name: "Dr. Tariq Mahmood", dept: "Cardiology", spec: "Interventional Cardiologist" },
  { email: "dr.fatima@demo-hospital.pk", name: "Dr. Fatima Noor", dept: "Orthopedics", spec: "Orthopedic Surgeon" },
];
const STAFF = [
  { email: "reception@demo-hospital.pk", name: "Sana Iqbal (Reception)" },
  { email: "triage@demo-hospital.pk", name: "Usman Ali (Triage Nurse)" },
];
const PATIENTS = [
  ["Muhammad Hassan", "M", "1985-03-12"], ["Zainab Bibi", "F", "1992-07-21"], ["Ali Raza", "M", "1978-11-02"],
  ["Hira Shah", "F", "2001-01-15"], ["Imran Qureshi", "M", "1965-05-30"], ["Nadia Akhtar", "F", "1989-09-09"],
  ["Ahmed Farooq", "M", "2015-04-18"], ["Rabia Siddiqui", "F", "1995-12-25"], ["Kamran Javed", "M", "1972-08-08"],
  ["Mariam Yousuf", "F", "1983-02-14"], ["Faisal Mehmood", "M", "1958-06-01"], ["Amna Tariq", "F", "2018-10-10"],
] as const;

const COMPLAINTS = ["Fever and body aches for 3 days", "Chest pain on exertion", "Persistent dry cough", "Knee pain while walking", "Headache and dizziness", "Abdominal pain after meals", "Shortness of breath", "Lower back pain", "Child with high fever and vomiting", "Follow-up for hypertension"];
const DX = [
  ["Viral fever", "Rest, fluids. Panadol 500mg TDS x 3 days"],
  ["Stable angina", "Aspirin 75mg OD, Atorvastatin 20mg HS. ECG and lipid profile"],
  ["Upper respiratory tract infection", "Azithromycin 500mg OD x 3 days, steam inhalation"],
  ["Osteoarthritis of knee", "Diclofenac 50mg BD after meals, physiotherapy"],
  ["Essential hypertension", "Amlodipine 5mg OD, low-salt diet, review in 2 weeks"],
  ["Gastritis", "Omeprazole 20mg BD before meals x 14 days"],
  ["Mechanical low back pain", "Paracetamol 1g PRN, posture advice, physiotherapy"],
];
const pick = <T,>(a: readonly T[], i: number) => a[i % a.length];

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await db.from("profiles").select("id").eq("email", DOCTORS[0].email).maybeSingle();
    if (existing) return { ok: true, message: "Demo data already loaded" };

    const mkUser = async (email: string, name: string) => {
      const { data, error } = await db.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: name } });
      if (error) throw new Error(`${email}: ${error.message}`);
      return data.user.id;
    };

    const { data: depts } = await db.from("departments").select("id,name_en");
    const deptId = (n: string) => depts?.find((d) => d.name_en === n)?.id ?? null;

    const docIds: string[] = [];
    for (const d of DOCTORS) {
      const id = await mkUser(d.email, d.name);
      docIds.push(id);
      await db.from("profiles").upsert({ id, email: d.email, full_name: d.name, phone: "+92 300 " + String(1000000 + docIds.length * 111111).slice(0, 7) });
      await db.from("user_roles").insert({ user_id: id, role: "doctor" });
      await db.from("doctors").insert({ user_id: id, full_name: d.name, department_id: deptId(d.dept), specialty: d.spec });
    }
    const staffIds: string[] = [];
    for (const s of STAFF) {
      const id = await mkUser(s.email, s.name);
      staffIds.push(id);
      await db.from("profiles").upsert({ id, email: s.email, full_name: s.name });
      await db.from("user_roles").insert({ user_id: id, role: "staff" });
      await db.from("staff_members").insert({ user_id: id, full_name: s.name, department_id: deptId("General Medicine") });
    }
    const patIds: string[] = [];
    for (let i = 0; i < PATIENTS.length; i++) {
      const [name, gender, dob] = PATIENTS[i];
      const email = `patient${i + 1}@demo-hospital.pk`;
      const id = await mkUser(email, name);
      patIds.push(id);
      await db.from("profiles").upsert({ id, email, full_name: name, gender: gender === "M" ? "male" : "female", date_of_birth: dob, phone: `+92 3${10 + i} ${4500000 + i * 7919}`, photo_consent_at: new Date().toISOString() });
      await db.from("user_roles").insert({ user_id: id, role: "patient" });
    }

    // Appointments: past 30 days + today
    const now = new Date();
    const dayStr = (off: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - off)).toISOString().slice(0, 10);
    let seq = 0;
    for (let off = 30; off >= 0; off--) {
      const date = dayStr(off);
      for (let di = 0; di < docIds.length; di++) {
        const count = off === 0 ? 7 : 3 + ((off + di) % 4);
        for (let tk = 1; tk <= count; tk++) {
          seq++;
          const walkin = seq % 6 === 0;
          const pid = walkin ? null : pick(patIds, seq + di);
          let status: string;
          if (off > 0) status = seq % 11 === 0 ? "no_show" : "completed";
          else status = tk <= 3 ? "completed" : tk === 4 ? "in_consultation" : tk <= 6 ? "checked_in" : "booked";
          const hour = 9 + ((tk + seq) % 8); // PKT 9am–5pm
          const base = new Date(`${date}T${String(hour - 5).padStart(2, "0")}:${String((seq * 7) % 60).padStart(2, "0")}:00Z`);
          const waitMin = 8 + (seq % 35);
          const checked = status !== "booked" && status !== "no_show" ? base.toISOString() : null;
          const called = ["completed", "in_consultation"].includes(status) ? new Date(base.getTime() + waitMin * 60000).toISOString() : null;
          const completed = status === "completed" ? new Date(base.getTime() + (waitMin + 12) * 60000).toISOString() : null;
          const { data: appt, error } = await db.from("appointments").insert({
            patient_id: pid, walkin_name: walkin ? pick(["Rashid Khan", "Shazia Parveen", "Waqar Younis", "Saima Gul"], seq) : null,
            walkin_phone: walkin ? "+92 333 " + (5000000 + seq) : null, doctor_id: docIds[di], appt_date: date, token_number: tk,
            is_walkin: walkin, status: status as never, checked_in_at: checked, called_at: called, completed_at: completed,
            created_by: walkin ? staffIds[0] : pid, created_at: new Date(base.getTime() - 86400000).toISOString(),
          }).select("id").single();
          if (error) throw new Error(error.message);
          if (checked) {
            await db.from("triage_records").insert({
              appointment_id: appt.id, blood_pressure: `${110 + (seq % 40)}/${70 + (seq % 20)}`, temperature: 98 + (seq % 5) * 0.5,
              pulse: 68 + (seq % 30), weight: 45 + (seq % 45), chief_complaint: pick(COMPLAINTS, seq), recorded_by: staffIds[1], created_at: base.toISOString(),
            });
          }
          if (status === "completed" || status === "in_consultation") {
            const [dx, rx] = pick(DX, seq);
            const done = status === "completed";
            await db.from("clinical_records").insert({
              appointment_id: appt.id, patient_id: pid, doctor_id: docIds[di],
              notes: done ? `Patient presented with ${pick(COMPLAINTS, seq).toLowerCase()}. Examination unremarkable apart from findings consistent with ${dx.toLowerCase()}.` : "",
              diagnosis: done ? dx : "", prescription: done ? rx : "", finalized: done, finalized_at: completed, created_at: called!,
            });
          }
        }
      }
    }

    const audit = [
      { action: "photo_locked", actor_name: PATIENTS[0][0], entity: "profile", priority: "normal" },
      { action: "patient_checked_in", actor_name: STAFF[0].name, entity: "appointment", priority: "normal" },
      { action: "triage_recorded", actor_name: STAFF[1].name, entity: "appointment", priority: "normal" },
      { action: "queue_advanced", actor_name: DOCTORS[0].name, entity: "appointment", priority: "normal" },
      { action: "transcript_finalized", actor_name: DOCTORS[1].name, entity: "clinical_record", priority: "normal" },
      { action: "photo_reset", actor_name: STAFF[0].name, entity: "profile", priority: "elevated", details: { justification: "Photo blurred, face not visible" } },
      { action: "break_glass_access", actor_name: DOCTORS[2].name, entity: "patient", priority: "high", details: { justification: "Unconscious patient in ER, needs cardiac history" } },
    ];
    await db.from("audit_logs").insert(audit.map((a, i) => ({ ...a, details: a.details ?? {}, created_at: new Date(now.getTime() - (audit.length - i) * 1800000).toISOString() })));
    return { ok: true, message: `Loaded ${DOCTORS.length} doctors, ${STAFF.length} staff, ${PATIENTS.length} patients and ${seq} appointments` };
  });
