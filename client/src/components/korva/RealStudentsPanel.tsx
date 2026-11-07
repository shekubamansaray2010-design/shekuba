import { FormEvent, useState } from "react";
import { ArrowLeft, CalendarDays, CircleAlert, History, Plus, Search, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { SchoolRole } from "./real-school-types";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const canEnroll = (role: SchoolRole) => ["school_owner", "principal", "school_admin", "admissions"].includes(role);
const canListClasses = (role: SchoolRole) => ["school_owner", "principal", "school_admin", "admissions", "teacher"].includes(role);
const statusLabel = (value: string) => value.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());

export default function RealStudentsPanel({ schoolId, role }: { schoolId: number; role: SchoolRole }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [admittedAt, setAdmittedAt] = useState(localDate());
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const list = trpc.korva.students.list.useQuery({ schoolId, search, limit: 100 }, { staleTime: 15_000 });
  const classes = trpc.korva.classes.list.useQuery({ schoolId }, { enabled: canListClasses(role) });
  const create = trpc.korva.students.create.useMutation({
    onSuccess: async (student) => {
      setSelectedId(student.id);
      setShowForm(false);
      setFullName("");
      setStudentNumber("");
      setMessage(`${student.fullName} was enrolled in ${student.className}.`);
      await Promise.all([utils.korva.students.list.invalidate(), utils.korva.school.overview.invalidate()]);
    },
  });

  async function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classId) return;
    setMessage("");
    create.mutate({ schoolId, classId: Number(classId), fullName, studentNumber, admittedAt });
  }

  if (selectedId !== null) return <RealStudentProfile schoolId={schoolId} studentId={selectedId} role={role} classes={classes.data ?? []} onBack={() => setSelectedId(null)} />;

  return <section className="korva-live-panel">
    <div className="korva-live-panel-head"><div><span className="korva-live-eyebrow">SCHOOL RECORDS</span><h2><UserRound size={20} /> {role === "student" ? "My student record" : role === "guardian" ? "Linked learner records" : "Student directory"}</h2><p>{role === "student" || role === "guardian" ? "Only records linked to your school membership are shown." : role === "teacher" ? "Only learners in your currently assigned classes are available." : "School-scoped records with event dates and recorded history."}</p></div>
      {canEnroll(role) && <button className="korva-live-button primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Enroll student</button>}
    </div>

    {showForm && canEnroll(role) && <form className="korva-live-form korva-live-form-grid" onSubmit={submitStudent}>
      <label>Student full name<input required minLength={2} maxLength={180} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Student number <span className="korva-live-muted">(optional)</span><input maxLength={80} value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} /></label>
      <label>Class<select required value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Choose an active class</option>{(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></label>
      <label>Enrollment date<input type="date" required max={localDate()} value={admittedAt} onChange={(event) => setAdmittedAt(event.target.value)} /></label>
      <div className="korva-live-form-actions"><button className="korva-live-button primary" type="submit" disabled={create.isPending || !classId}>{create.isPending ? "Saving…" : "Save enrollment"}</button><button type="button" className="korva-live-button secondary" onClick={() => setShowForm(false)}>Cancel</button></div>
      <p className="korva-live-footnote">The enrollment date and the time this record is entered are stored separately. No health or safeguarding fields are collected here.</p>
    </form>}

    {create.error && <p className="korva-live-error" role="alert"><CircleAlert size={15} />{create.error.message}</p>}
    {message && <p className="korva-live-success" role="status">{message}</p>}
    {role !== "student" && role !== "guardian" && <div className="korva-live-search"><Search size={16} /><input placeholder="Search names" value={search} onChange={(event) => setSearch(event.target.value)} /></div>}
    {list.isLoading && <p className="korva-live-muted">Loading school records…</p>}
    {list.error && <p className="korva-live-error" role="alert">{list.error.message}</p>}
    {list.data?.length === 0 && <div className="korva-live-empty">{role === "student" || role === "guardian" ? "No learner has been linked to this account yet." : "No matching student records."}</div>}
    {!!list.data?.length && <div className="korva-live-student-list">{list.data.map((student) => <button className="korva-live-student-row" type="button" key={student.id} onClick={() => setSelectedId(student.id)}>
      <span className="korva-live-student-avatar">{student.fullName.slice(0, 1).toUpperCase()}</span><span className="korva-live-student-info"><strong>{student.fullName}</strong><small>{student.className} · {student.academicYear}{student.studentNumber ? ` · ${student.studentNumber}` : ""}</small></span><span className={`korva-live-status ${student.status === "active" ? "submitted" : "draft"}`}>{statusLabel(student.status)}</span>
    </button>)}</div>}
  </section>;
}

function RealStudentProfile({ schoolId, studentId, role, classes, onBack }: { schoolId: number; studentId: number; role: SchoolRole; classes: { id: number; name: string; academicYear: string }[]; onBack: () => void }) {
  const [newClassId, setNewClassId] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [eventDate, setEventDate] = useState(localDate());
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const profile = trpc.korva.students.get.useQuery({ schoolId, studentId });
  const placement = trpc.korva.students.placement.useMutation({
    onSuccess: async () => {
      setMessage("Student history updated with the event date, recording time, and change reason.");
      setNewClassId("");
      setNewStatus("");
      setReason("");
      await Promise.all([utils.korva.students.get.invalidate(), utils.korva.students.list.invalidate()]);
    },
  });
  const canEditPlacement = ["school_owner", "principal", "school_admin", "admissions"].includes(role);
  const record = profile.data;
  const student = record?.student;

  function submitPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newClassId && !newStatus) return;
    placement.mutate({ schoolId, studentId, newClassId: newClassId ? Number(newClassId) : undefined, newStatus: newStatus ? newStatus as "active" | "transferred" | "withdrawn" : undefined, eventDate, reason });
  }

  return <section className="korva-live-panel">
    <button type="button" className="korva-live-back" onClick={onBack}><ArrowLeft size={16} /> Back to student records</button>
    {profile.isLoading && <p className="korva-live-muted">Loading the dated student record…</p>}
    {profile.error && <p className="korva-live-error" role="alert">{profile.error.message}</p>}
    {student && record && <>
      <div className="korva-live-profile-head"><span className="korva-live-profile-avatar">{student.fullName.slice(0, 1).toUpperCase()}</span><div><span className="korva-live-eyebrow">STUDENT PROFILE</span><h2>{student.fullName}</h2><p>{student.className} · {student.academicYear}{student.studentNumber ? ` · ${student.studentNumber}` : ""}</p></div><span className={`korva-live-status ${student.status === "active" ? "submitted" : "draft"}`}>{statusLabel(student.status)}</span></div>
      <div className="korva-live-profile-facts"><div><small>Admission event date</small><strong><CalendarDays size={15} /> {student.admittedAt}</strong></div><div><small>Record created</small><strong>{new Date(student.createdAt).toLocaleString()}</strong></div><div><small>Last record update</small><strong>{new Date(student.updatedAt).toLocaleString()}</strong></div></div>
      {canEditPlacement && <details className="korva-live-details"><summary>Record a class or status change</summary><form className="korva-live-form korva-live-form-grid" onSubmit={submitPlacement}>
        <label>New class<select value={newClassId} onChange={(event) => setNewClassId(event.target.value)}><option value="">Keep current class</option>{classes.filter((item) => item.id !== student.classId).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></label>
        <label>New status<select value={newStatus} onChange={(event) => setNewStatus(event.target.value)}><option value="">Keep current status</option><option value="active">Active / re-admitted</option><option value="transferred">Transferred</option><option value="withdrawn">Withdrawn</option></select></label>
        <label>Event date<input type="date" required max={localDate()} value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
        <label>Reason<input required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Promotion, transfer, withdrawal…" /></label>
        <div className="korva-live-form-actions"><button type="submit" className="korva-live-button primary" disabled={placement.isPending || (!newClassId && !newStatus)}>{placement.isPending ? "Saving…" : "Save dated change"}</button></div>
      </form></details>}
      {placement.error && <p className="korva-live-error" role="alert">{placement.error.message}</p>}{message && <p className="korva-live-success" role="status">{message}</p>}
      <div className="korva-live-profile-columns">
        <section><h3><History size={17} /> Record history</h3>{record.history.length === 0 ? <p className="korva-live-muted">No history events have been recorded.</p> : <ol className="korva-live-timeline">{record.history.map((event) => <li key={event.id}><span className="korva-live-timeline-dot" /><div><strong>{statusLabel(event.eventType)}</strong><small>Event date: {event.eventDate} · Recorded: {new Date(event.recordedAt).toLocaleString()}</small>{Object.entries(event.details ?? {}).filter(([key, value]) => !key.endsWith("ClassId") && value !== null).map(([key, value]) => <small key={key}>{statusLabel(key)}: {String(value)}</small>)}</div></li>)}</ol>}</section>
        <section><h3><CalendarDays size={17} /> Attendance history</h3>{record.attendance.length === 0 ? <p className="korva-live-muted">No attendance records are available to this role.</p> : <div className="korva-live-attendance-history">{record.attendance.map((item, index) => <div key={`${item.date}-${index}`}><strong>{item.date}</strong><span className={`korva-live-mark mark-${item.mark}`}>{statusLabel(item.mark)}</span><small>Last recorded {new Date(item.updatedAt).toLocaleString()}</small></div>)}</div>}</section>
      </div>
    </>}
  </section>;
}
