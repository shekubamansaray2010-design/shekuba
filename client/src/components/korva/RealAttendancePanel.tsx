import { useEffect, useState } from "react";
import { CalendarCheck2, Check, CircleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { SchoolRole } from "./real-school-types";

type Mark = "present" | "absent" | "late" | "excused";
const MARKS: Mark[] = ["present", "absent", "late", "excused"];

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function markLabel(mark: string | null) {
  if (!mark) return "Not marked";
  return mark.charAt(0).toUpperCase() + mark.slice(1);
}

export default function RealAttendancePanel({ schoolId, role }: { schoolId: number; role: SchoolRole }) {
  const classes = trpc.korva.classes.list.useQuery({ schoolId }, { staleTime: 30_000 });
  const [classId, setClassId] = useState<number | null>(null);
  const [date, setDate] = useState(localDate);
  const [draft, setDraft] = useState<Record<number, Mark | "">>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const classOptions = classes.data ?? [];

  useEffect(() => {
    if (classOptions.length && (classId === null || !classOptions.some((item) => item.id === classId))) {
      setClassId(classOptions[0]!.id);
    }
  }, [classOptions, classId]);

  const register = trpc.korva.attendance.register.useQuery(
    { schoolId, classId: classId ?? 1, date },
    { enabled: classId !== null && classes.isSuccess },
  );

  useEffect(() => {
    if (!register.data) return;
    setDraft(Object.fromEntries(register.data.rows.map((row) => [row.studentId, row.mark ?? ""])));
    setReasons({});
  }, [register.data]);

  const submit = trpc.korva.attendance.submit.useMutation({
    onSuccess: async () => {
      setMessage("Attendance was submitted and recorded with the selected date.");
      await Promise.all([
        utils.korva.attendance.register.invalidate(),
        utils.korva.school.overview.invalidate(),
      ]);
    },
  });
  const correct = trpc.korva.attendance.correct.useMutation({
    onSuccess: async () => {
      setMessage("Correction saved with its reason in the school audit history.");
      await utils.korva.attendance.register.invalidate();
    },
  });

  const data = register.data;
  const isSubmitted = Boolean(data?.sessionId);
  const allMarked = Boolean(data?.rows.length) && data!.rows.every((row) => Boolean(draft[row.studentId]));
  const busy = submit.isPending || correct.isPending;

  function submitRegister() {
    if (!data || classId === null) return;
    setMessage("");
    submit.mutate({
      schoolId,
      classId,
      date,
      marks: data.rows.map((row) => ({ studentId: row.studentId, mark: draft[row.studentId] as Mark })),
    });
  }

  function correctMark(studentId: number, original: Mark | null) {
    if (!data?.sessionId || !draft[studentId] || !original || draft[studentId] === original) return;
    setMessage("");
    correct.mutate({
      schoolId,
      sessionId: data.sessionId,
      studentId,
      mark: draft[studentId] as Mark,
      reason: reasons[studentId] ?? "",
    });
  }

  return <section className="korva-live-panel">
    <div className="korva-live-panel-head"><div><span className="korva-live-eyebrow">CLASSROOM OPERATIONS</span><h2><CalendarCheck2 size={20} /> Attendance register</h2><p>Mark the full active roster, then submit once. Submitted marks can only be corrected with a reason.</p></div></div>
    <div className="korva-live-toolbar">
      <label>Assigned class
        <select value={classId ?? ""} onChange={(event) => setClassId(event.target.value ? Number(event.target.value) : null)}>
          {classOptions.length === 0 && <option value="">No assigned classes</option>}
          {classOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}
        </select>
      </label>
      <label>Attendance date<input type="date" value={date} max={localDate()} onChange={(event) => setDate(event.target.value)} /></label>
      <span className={`korva-live-status ${isSubmitted ? "submitted" : "draft"}`}>{isSubmitted ? "Submitted" : "Not submitted"}</span>
    </div>
    {classes.isLoading && <p className="korva-live-muted">Loading your classes…</p>}
    {classes.error && <p className="korva-live-error" role="alert">{classes.error.message}</p>}
    {classId !== null && register.isLoading && <p className="korva-live-muted">Loading the dated class register…</p>}
    {register.error && <p className="korva-live-error" role="alert">{register.error.message}</p>}
    {data && <>
      {isSubmitted && <p className="korva-live-notice"><Check size={16} /> Submitted {data.submittedAt ? new Date(data.submittedAt).toLocaleString() : ""}. Existing marks are locked except for reasoned corrections.</p>}
      {!isSubmitted && data.rows.length === 0 && <p className="korva-live-empty">No active students are enrolled in this class yet.</p>}
      {data.rows.length > 0 && <div className="korva-live-table-wrap"><table className="korva-live-table"><thead><tr><th>Student</th><th>Student number</th><th>Status</th>{isSubmitted && <th>Correction reason</th>}</tr></thead><tbody>
        {data.rows.map((row) => {
          const original = row.mark as Mark | null;
          const selected = draft[row.studentId] ?? "";
          const changed = isSubmitted && original !== null && selected !== original;
          return <tr key={row.studentId}>
            <td><strong>{row.fullName}</strong></td>
            <td>{row.studentNumber || "—"}</td>
            <td><select aria-label={`Attendance for ${row.fullName}`} value={selected} onChange={(event) => setDraft((previous) => ({ ...previous, [row.studentId]: event.target.value as Mark | "" }))}>
              <option value="">Choose status</option>{MARKS.map((mark) => <option key={mark} value={mark}>{markLabel(mark)}</option>)}
            </select>{isSubmitted && original && <small className="korva-live-original">Original: {markLabel(original)}</small>}</td>
            {isSubmitted && <td>{original === null ? <span className="korva-live-muted">No original mark for this learner.</span> : changed ? <div className="korva-live-correction"><input aria-label={`Correction reason for ${row.fullName}`} placeholder="Required reason" value={reasons[row.studentId] ?? ""} onChange={(event) => setReasons((previous) => ({ ...previous, [row.studentId]: event.target.value }))} /><button type="button" className="korva-live-button compact" disabled={busy || (reasons[row.studentId] ?? "").trim().length < 3} onClick={() => correctMark(row.studentId, original)}>Save correction</button></div> : <span className="korva-live-muted">No change</span>}</td>}
          </tr>;
        })}
      </tbody></table></div>}
      {!isSubmitted && data.rows.length > 0 && <div className="korva-live-submit-row"><span>{data.rows.filter((row) => draft[row.studentId]).length} of {data.rows.length} students marked</span><button className="korva-live-button primary" type="button" disabled={!allMarked || busy} onClick={submitRegister}>Submit attendance</button></div>}
    </>}
    {(submit.error || correct.error) && <p className="korva-live-error" role="alert"><CircleAlert size={15} />{submit.error?.message || correct.error?.message}</p>}
    {message && <p className="korva-live-success" role="status">{message}</p>}
    <p className="korva-live-footnote">Your access is scoped to {role === "teacher" ? "classes assigned to your teacher membership" : "this selected school"}. Saving an attendance register is a school-record action.</p>
  </section>;
}
