import { FormEvent, useState } from "react";
import { BookOpen, CircleAlert, Plus, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { SchoolRole } from "./real-school-types";

const canManage = (role: SchoolRole) => ["school_owner", "principal", "school_admin"].includes(role);
const canAssign = canManage;

export default function RealClassesPanel({ schoolId, role }: { schoolId: number; role: SchoolRole }) {
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [teacherMembershipId, setTeacherMembershipId] = useState("");
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const classes = trpc.korva.classes.list.useQuery({ schoolId });
  const members = trpc.korva.school.members.useQuery({ schoolId }, { enabled: canAssign(role) });
  const create = trpc.korva.classes.create.useMutation({
    onSuccess: async () => {
      setName(""); setMessage("Class created.");
      await Promise.all([utils.korva.classes.list.invalidate(), utils.korva.school.overview.invalidate()]);
    },
  });
  const assign = trpc.korva.classes.assignTeacher.useMutation({
    onSuccess: async () => {
      setMessage("Teacher assigned to this class.");
      await Promise.all([utils.korva.classes.list.invalidate(), utils.korva.school.overview.invalidate()]);
    },
  });
  const teachers = members.data?.filter((item) => item.role === "teacher" && item.status === "active") ?? [];

  function submitClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); create.mutate({ schoolId, name, academicYear });
  }
  function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!assignmentClassId || !teacherMembershipId) return;
    setMessage(""); assign.mutate({ schoolId, classId: Number(assignmentClassId), teacherMembershipId: Number(teacherMembershipId) });
  }

  return <section className="korva-live-panel">
    <div className="korva-live-panel-head"><div><span className="korva-live-eyebrow">SCHOOL STRUCTURE</span><h2><BookOpen size={20} /> Classes & teacher assignments</h2><p>{role === "teacher" ? "Only classes assigned to your membership are listed." : "Class groups belong to this school and academic year."}</p></div></div>
    {canManage(role) && <form className="korva-live-form korva-live-inline-form" onSubmit={submitClass}>
      <label>Class name<input required minLength={1} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. SS 2 Science" /></label>
      <label>Academic year<input required minLength={4} maxLength={20} value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} /></label>
      <button className="korva-live-button primary" type="submit" disabled={create.isPending}><Plus size={15} />{create.isPending ? "Saving…" : "Create class"}</button>
    </form>}
    {canAssign(role) && teachers.length > 0 && <form className="korva-live-form korva-live-inline-form" onSubmit={submitAssignment}>
      <label>Class<select required value={assignmentClassId} onChange={(event) => setAssignmentClassId(event.target.value)}><option value="">Choose class</option>{(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></label>
      <label>Teacher<select required value={teacherMembershipId} onChange={(event) => setTeacherMembershipId(event.target.value)}><option value="">Choose teacher</option>{teachers.map((item) => <option key={item.membershipId} value={item.membershipId}>{item.name || "Unnamed teacher"}</option>)}</select></label>
      <button className="korva-live-button secondary" type="submit" disabled={assign.isPending}><UsersRound size={15} /> Assign teacher</button>
    </form>}
    {(create.error || assign.error) && <p className="korva-live-error" role="alert"><CircleAlert size={15} />{create.error?.message || assign.error?.message}</p>}
    {message && <p className="korva-live-success" role="status">{message}</p>}
    {classes.isLoading && <p className="korva-live-muted">Loading class groups…</p>}
    {classes.error && <p className="korva-live-error" role="alert">{classes.error.message}</p>}
    {!classes.isLoading && classes.data?.length === 0 && <div className="korva-live-empty">No active classes are available for this role.</div>}
    {!!classes.data?.length && <div className="korva-live-class-list">{classes.data.map((item) => <article key={item.id} className="korva-live-class-row"><span className="korva-live-class-icon"><BookOpen size={18} /></span><div><strong>{item.name}</strong><small>{item.academicYear}</small></div><span className="korva-live-status submitted">Active</span></article>)}</div>}
    <p className="korva-live-footnote">Class assignments are server-checked on student and attendance requests; selecting a role in the browser does not grant class access.</p>
  </section>;
}
