import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  ClipboardCheck, Cloud, CreditCard, FileBarChart2, GraduationCap, LayoutDashboard, Menu, Moon,
  MoreHorizontal, Search, Settings2, Shield, Sun, Users, Wallet, X, Bell, Clock3, CircleAlert, LogOut,
  UserRound, School, MessagesSquare, Library, BriefcaseBusiness, FileCheck2, Sparkles, RotateCcw,
} from "lucide-react";
import {
  AttendanceMark, AttendanceRegister, DemoRole, DemoSchoolData, DemoState, DemoStudent,
  NAV_ITEMS, ROLE_META, SCHOOLS, createSeedState, dateKey, formatDate, formatMoney,
  loadDemoState, saveDemoState,
} from "@/lib/korva-demo";

type Props = { onExit: () => void };
type PageId = (typeof NAV_ITEMS)[number]["id"] | "schools";
type PendingOperation = { id: string; label: string; at: string };
const PENDING_STORAGE_KEY = "korva-demo-local-changes-v1";
function loadPendingOperations(): PendingOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PENDING_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown): item is PendingOperation => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Record<string, unknown>;
      return typeof entry.id === "string" && typeof entry.label === "string" && typeof entry.at === "string";
    });
  } catch { return []; }
}

const MARKS: { key: AttendanceMark; label: string; short: string }[] = [
  { key: "P", label: "Present", short: "P" },
  { key: "A", label: "Absent", short: "A" },
  { key: "L", label: "Late", short: "L" },
  { key: "E", label: "Excused", short: "E" },
];
const ROLE_CLASS: Record<DemoRole, string> = { principal: "leader", teacher: "teacher", platform: "platform" };
const iconMap: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, students: Users, attendance: ClipboardCheck, classes: School,
  assessments: FileCheck2, results: FileBarChart2, learning: BookOpen, forums: MessagesSquare,
  finance: Wallet, communications: Bell, leaderboards: Activity, national: FileBarChart2, sync: RotateCcw,
};
const PAGE_META: Record<string, { title: string; note: string }> = {
  classes: { title: "Classes & streams", note: "Manage grade structure and student groups." },
  assessments: { title: "Assessments", note: "Review teacher-submitted marks and assessment work." },
  results: { title: "Results & reports", note: "Prepare, review, and publish student reports." },
  learning: { title: "Learning resources", note: "Share learning materials and student assignments." },
  forums: { title: "Class forums", note: "Teacher-led conversations for assigned school groups." },
  finance: { title: "Finance & fees", note: "Invoices, payment verification, and school reconciliation." },
  communications: { title: "Communication", note: "Notices, messages, calendars, and family updates." },
  leaderboards: { title: "Leaderboards", note: "Explore approved school performance trends." },
  national: { title: "National reporting", note: "Prepare authorized education reports and exports." },
  sync: { title: "Sync centre", note: "Offline edits remain saved in this browser. This demo does not upload or reconcile them." },
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function currentTimeLabel() {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function SvgMark({ size = 34 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="korva-mark"><path d="M2 20 16 4l14 16-8-3-6 9-6-9z" fill="currentColor" /></svg>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "gold" }) {
  return <span className={`korva-badge ${tone}`}>{children}</span>;
}

function Metric({ label, value, detail, icon: Icon, trend, tone = "blue" }: {
  label: string; value: string | number; detail: string; icon: typeof Users; trend?: string; tone?: string;
}) {
  return <article className="korva-metric">
    <div className={`korva-metric-icon ${tone}`}><Icon size={19} strokeWidth={1.9} /></div>
    {trend && <span className="korva-metric-trend"><ArrowDownRight size={13} />{trend}</span>}
    <p>{label}</p><strong>{value}</strong><small>{detail}</small>
  </article>;
}

export default function KORVADemo({ onExit }: Props) {
  const [state, setState] = useState<DemoState>(() => loadDemoState());
  const [role, setRole] = useState<DemoRole>("principal");
  const [schoolId, setSchoolId] = useState("s1");
  const [page, setPage] = useState<PageId>("dashboard");
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState<DemoStudent | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("korva-demo-theme") === "dark"; } catch { return false; }
  });
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState<PendingOperation[]>(() => loadPendingOperations());
  const [toast, setToast] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [registerMarks, setRegisterMarks] = useState<Record<string, AttendanceMark>>({});
  const [correctionReason, setCorrectionReason] = useState("");
  const [formName, setFormName] = useState("");
  const [formGuardian, setFormGuardian] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formError, setFormError] = useState("");
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const [activityFilter, setActivityFilter] = useState("All activity");
  const school = SCHOOLS.find((item) => item.id === schoolId)!;
  const data: DemoSchoolData = state.schools[schoolId];
  const roleMeta = ROLE_META[role];
  const isLeader = role === "principal";
  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(role as never));
  const canRegister = isLeader && schoolId === "s1";
  const canEditAttendance = role === "principal" || (role === "teacher" && schoolId === "s1");
  const today = dateKey();
  const todayRegister = data.attendance.find((item) => item.date === today && item.classId === classFilter);

  useEffect(() => { saveDemoState(state); }, [state]);
  useEffect(() => {
    const onlineHandler = () => {
      setOnline(true);
      if (pending.length) setToast(`You’re back online. ${pending.length} local demo change${pending.length === 1 ? " remains" : "s remain"} in this browser; no server sync was attempted.`);
    };
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => { window.removeEventListener("online", onlineHandler); window.removeEventListener("offline", offlineHandler); };
  }, [pending]);
  useEffect(() => {
    try { window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending)); } catch { /* The rest of the demo remains usable if local storage is full. */ }
  }, [pending]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem("korva-demo-theme", dark ? "dark" : "light"); } catch { /* Theme remains available for this session. */ }
  }, [dark]);
  useEffect(() => {
    if (data.classes.length && !data.classes.some((item) => item.id === classFilter)) setClassFilter(data.classes[0].id);
    if (!data.classes.length) setClassFilter("");
  }, [data.classes, classFilter]);
  useEffect(() => {
    if (page !== "attendance" || !classFilter) return;
    const savedRegister = data.attendance.find((item) => item.date === today && item.classId === classFilter);
    setRegisterMarks(savedRegister ? { ...savedRegister.records } : {});
    setCorrectionReason("");
  }, [page, classFilter, schoolId, data.attendance, today]);
  useEffect(() => {
    if (schoolId !== "s1" && role === "teacher") setPage("dashboard");
  }, [schoolId, role]);

  function logActivity(message: string) {
    setState((current) => {
      const next = structuredClone(current);
      next.schools[schoolId].activity.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), message, actor: `${roleMeta.label} · demo` });
      return next;
    });
  }

  function changeRole(nextRole: DemoRole) {
    setRole(nextRole);
    setStudent(null);
    setShowAdd(false);
    setMobileOpen(false);
    setSearch("");
    setPage(nextRole === "platform" ? "schools" : "dashboard");
  }

  function navigate(nextPage: PageId) {
    if (nextPage === "finance" && !isLeader) return;
    if (role === "platform" && nextPage !== "schools") return;
    setPage(nextPage);
    setStudent(null);
    setMobileOpen(false);
  }

  function openRegister() {
    if (!data.classes.length) return;
    const initial: Record<string, AttendanceMark> = {};
    const existing = data.attendance.find((row) => row.date === today && row.classId === classFilter);
    const studentsInClass = data.students.filter((item) => item.classId === classFilter && (role !== "teacher" || data.classes.find((c) => c.id === classFilter)?.teacherIds.includes("teacher-1")));
    studentsInClass.forEach((item) => { if (existing?.records[item.id]) initial[item.id] = existing.records[item.id]; });
    setRegisterMarks(initial);
    setCorrectionReason("");
  }

  function saveAttendance() {
    const classInfo = data.classes.find((item) => item.id === classFilter);
    const studentsInClass = data.students.filter((item) => item.classId === classFilter);
    if (!classInfo || studentsInClass.length === 0) { setToast("There are no students in this class yet."); return; }
    const unmarked = studentsInClass.filter((item) => !registerMarks[item.id]);
    if (unmarked.length) { setToast(`Mark all ${studentsInClass.length} students before submitting. ${unmarked.length} remaining.`); return; }
    const existing = data.attendance.find((row) => row.date === today && row.classId === classFilter);
    if (existing && correctionReason.trim().length < 6) { setToast("Add a correction reason (at least 6 characters). Changes are recorded in the demo activity history."); return; }
    const pendingLocal = !online;
    const register: AttendanceRegister = {
      id: existing?.id ?? crypto.randomUUID(), date: today, classId: classFilter,
      records: { ...registerMarks }, status: pendingLocal ? "Saved offline" : "Submitted",
      correctionReason: existing ? correctionReason.trim() : undefined,
      submittedAt: new Date().toISOString(),
    };
    setState((current) => {
      const next = structuredClone(current);
      const target = next.schools[schoolId];
      const index = target.attendance.findIndex((row) => row.id === register.id);
      if (index >= 0) target.attendance[index] = register;
      else target.attendance.unshift(register);
      target.activity.unshift({
        id: crypto.randomUUID(), at: new Date().toISOString(),
        message: `${existing ? "Attendance corrected" : "Attendance register submitted"}: ${classInfo.name}${existing ? ` — ${correctionReason.trim()}` : ""}${pendingLocal ? " (saved in this browser; offline)" : " (demo only)"}`,
        actor: `${roleMeta.label} · demo`,
      });
      return next;
    });
    if (pendingLocal) setPending((queue) => [...queue, { id: crypto.randomUUID(), label: `Attendance · ${classInfo.name}`, at: new Date().toISOString() }]);
    setToast(pendingLocal ? "Saved in this browser. Reconnecting will not upload it." : "Demo attendance saved in this browser only; nothing was sent to a server.");
    setPage("attendance");
  }

  function submitStudent() {
    const name = formName.trim();
    const guardian = formGuardian.trim();
    if (name.length < 3 || !guardian || !formClass) { setFormError("Enter a full name, guardian name, and class."); return; }
    const duplicate = data.students.find((item) => item.name.trim().toLowerCase() === name.toLowerCase() && item.classId === formClass);
    if (duplicate && !duplicateConfirm) { setDuplicateConfirm(true); setFormError(`Possible duplicate: ${duplicate.id} is already in this class. Review before saving again.`); return; }
    const newId = `SES-2026-${String(data.students.length + 1).padStart(3, "0")}`;
    const admitted = today;
    const recordedAt = new Date().toISOString();
    const className = data.classes.find((item) => item.id === formClass)?.name ?? "Class";
    const newStudent: DemoStudent = {
      id: newId, name, guardian, classId: formClass, status: "Active", admitted,
      attendance: [], reports: [],
      events: [{ id: crypto.randomUUID(), kind: "Enrollment", title: "Registered in browser demo", eventDate: admitted, recordedAt, detail: `Assigned to ${className}; no guardian verification is performed by this prototype.` }],
    };
    setState((current) => {
      const next = structuredClone(current);
      next.schools[schoolId].students.unshift(newStudent);
      next.schools[schoolId].activity.unshift({ id: crypto.randomUUID(), at: recordedAt, message: `Demo student registered: ${name} (${newId})`, actor: `${roleMeta.label} · demo` });
      return next;
    });
    if (!online) setPending((queue) => [...queue, { id: crypto.randomUUID(), label: `Student registration · ${name}`, at: recordedAt }]);
    setShowAdd(false); setFormName(""); setFormGuardian(""); setFormClass(""); setFormError(""); setDuplicateConfirm(false);
    setStudent(newStudent); setPage("students");
    setToast(online ? "Fictional student added to this browser’s demo data; no server write occurred." : "Student saved in this browser while offline. Reconnecting will not upload it.");
  }

  const className = (id: string) => data.classes.find((item) => item.id === id)?.name ?? "Unassigned";
  const students = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = data.students;
    if (role === "teacher") rows = rows.filter((item) => data.classes.find((c) => c.id === item.classId)?.teacherIds.includes("teacher-1"));
    if (term) rows = rows.filter((item) => `${item.id} ${item.name} ${className(item.classId)} ${item.guardian}`.toLowerCase().includes(term));
    return rows;
  }, [data.students, data.classes, search, role]);
  const attendanceSummary = useMemo(() => {
    const registers = data.attendance.filter((item) => item.date === today);
    const marks = registers.flatMap((item) => Object.values(item.records));
    const present = marks.filter((mark) => mark === "P" || mark === "L").length;
    return { registers: registers.length, marked: marks.length, present, rate: marks.length ? Math.round((present / marks.length) * 100) : null };
  }, [data.attendance, today]);
  const pendingVerification = 1;
  const verifiedFees = 1000;
  const sectionLabel = (group: string) => <p className="korva-nav-label" key={group}>{group}</p>;

  return <div className={`korva-app ${dark ? "dark" : ""}`}>
    <div className="korva-demo-ribbon"><Shield size={14} /> DEMO DATA <span>Stored only in this browser. This prototype is not a production school record system.</span></div>
    <aside className={`korva-sidebar ${mobileOpen ? "open" : ""}`} aria-label="Main navigation">
      <button className="korva-brand" onClick={() => navigate("dashboard")} aria-label="KORVA dashboard">
        <span className="korva-brand-mark"><SvgMark size={31} /></span><span>KORVA<small>RISE. LEARN. LEAD.</small></span>
      </button>
      <div className="korva-sidebar-school"><span className="korva-school-emblem"><School size={19} /></span><span className="korva-school-lines"><strong>{school.name}</strong><small>{school.status === "Setup" ? "Setup workspace" : "Academic year 2026"}</small></span><ChevronDown size={14} /></div>
      <nav className="korva-nav">
        {role === "platform" ? <>
          {sectionLabel("PLATFORM")}
          <button className={`korva-nav-item ${page === "schools" ? "active" : ""}`} onClick={() => navigate("schools")}><LayoutDashboard size={17} /><span>Schools</span><span className="korva-nav-count">2</span></button>
        </> : <>
          {Array.from(new Set(allowedNav.map((item) => item.group))).map((group) => <div className="korva-nav-group" key={group}>
            {sectionLabel(group.toUpperCase())}
            {allowedNav.filter((item) => item.group === group).map((item) => {
              const Icon = iconMap[item.id] ?? LayoutDashboard;
              return <button key={item.id} className={`korva-nav-item ${page === item.id && !student ? "active" : ""}`} onClick={() => navigate(item.id as PageId)}>
                <Icon size={17} /><span>{item.label}</span>{"phase" in item && item.phase && <span className="korva-phase">{item.phase}</span>}
              </button>;
            })}
          </div>)}
        </>}
      </nav>
      <div className="korva-sidebar-bottom"><div className="korva-help-card"><Sparkles size={16} /><strong>Make school days simpler.</strong><span>One clear place for the work that moves learning forward.</span><button onClick={() => setToast("This is a fictional browser demo; integrations are not connected.")}>About this demo <ArrowRight size={13} /></button></div>
        <div className="korva-profile"><span className={`korva-avatar ${ROLE_CLASS[role]}`}>{roleMeta.initials}</span><span><strong>{roleMeta.label}</strong><small>Demo workspace</small></span><MoreHorizontal size={18} /></div></div>
    </aside>
    {mobileOpen && <button className="korva-mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className="korva-main">
      <header className="korva-topbar">
        <button className="korva-icon-button korva-menu-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation"><Menu size={20} /></button>
        <div className="korva-breadcrumb"><span>School workspace</span><span>/</span><strong>{page === "schools" ? "Schools" : student ? student.name : navLabel(page)}</strong></div>
        <div className="korva-topbar-actions">
          {role !== "platform" && <label className="korva-school-switch"><span className="sr-only">Switch school</span><School size={15} /><select aria-label="Switch demo school" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setStudent(null); setPage("dashboard"); }}>
            {SCHOOLS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select><ChevronDown size={13} /></label>}
          <span className={`korva-online-pill ${online ? "online" : "offline"}`} title="Local demo changes stay in this browser; no server synchronization is active."><span className="korva-online-dot" />{online ? "Online" : "Offline"}{pending.length > 0 && <b>{pending.length} local</b>}</span>
          <button className="korva-icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="korva-top-avatar" aria-label="Switch demo role" title="Switch demo role" onClick={() => changeRole(role === "principal" ? "teacher" : role === "teacher" ? "platform" : "principal")}>{roleMeta.initials}</button>
          <button className="korva-exit-demo" onClick={onExit}><LogOut size={15} /><span>Exit demo</span></button>
        </div>
      </header>

      <div className="korva-content">
        {role === "teacher" && schoolId === "s2" && <div className="korva-inline-banner"><CircleAlert size={17} /><span>This sample school is still being set up. No teacher class assignments are available in this demo tenant.</span></div>}
        {role === "platform" ? <PlatformSchools state={state} /> : page === "dashboard" ? <Dashboard
          data={data} schoolName={school.name} role={role} attendanceSummary={attendanceSummary}
          pendingCount={pending.length} pendingVerification={pendingVerification} verifiedFees={verifiedFees}
          onNavigate={navigate} onAddStudent={() => { setShowAdd(true); setFormClass(data.classes[0]?.id ?? ""); }}
        /> : page === "students" ? <StudentsPage
          students={students} search={search} setSearch={setSearch} className={className}
          canRegister={canRegister} onAdd={() => { setShowAdd(true); setFormClass(data.classes[0]?.id ?? ""); }}
          onOpen={setStudent} onReset={() => { setState(createSeedState()); setPending([]); setStudent(null); setToast("Demo workspace reset to fictional example data."); }}
        /> : page === "attendance" ? <AttendancePage
          data={data} role={role} classFilter={classFilter} setClassFilter={setClassFilter}
          marks={registerMarks} setMarks={setRegisterMarks} correctionReason={correctionReason}
          setCorrectionReason={setCorrectionReason} online={online} pendingCount={pending.length}
          onStart={openRegister} onSubmit={saveAttendance} /> : <PlannedPage page={page} onNavigate={navigate} />}
      </div>
      <footer className="korva-footer"><span>© 2026 KORVA <i>•</i> Rise. Learn. Lead.</span><span>Fictional demo school data <i>•</i> Leones (SLE)</span></footer>
    </main>
    {student && <StudentPanel student={student} data={data} role={role} onClose={() => setStudent(null)} />}
    {showAdd && <AddStudentDialog
      data={data} name={formName} setName={(value) => { setFormName(value); setDuplicateConfirm(false); }}
      guardian={formGuardian} setGuardian={setFormGuardian} classId={formClass} setClassId={setFormClass}
      error={formError} duplicateConfirm={duplicateConfirm} onCancel={() => { setShowAdd(false); setFormError(""); setDuplicateConfirm(false); }} onSave={submitStudent}
    />}
    {toast && <div className="korva-toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}

function navLabel(page: PageId) {
  if (page === "schools") return "Schools";
  return NAV_ITEMS.find((item) => item.id === page)?.label ?? "Dashboard";
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="korva-page-heading"><div><p className="korva-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="korva-subtitle">{subtitle}</p></div>{action && <div className="korva-page-action">{action}</div>}</div>;
}

function Dashboard({ data, schoolName, role, attendanceSummary, pendingCount, pendingVerification, verifiedFees, onNavigate, onAddStudent }: {
  data: DemoSchoolData; schoolName: string; role: DemoRole; attendanceSummary: { registers: number; marked: number; present: number; rate: number | null };
  pendingCount: number; pendingVerification: number; verifiedFees: number; onNavigate: (page: PageId) => void; onAddStudent: () => void;
}) {
  const leader = role === "principal";
  const teacher = role === "teacher";
  const classMap = new Map(data.classes.map((item) => [item.id, item.name]));
  const classCounts = data.classes.map((item) => ({ ...item, count: data.students.filter((student) => student.classId === item.id).length }));
  return <>
    <PageHeading eyebrow={leader ? "SCHOOL OVERVIEW" : "YOUR CLASSROOM"} title={leader ? "Good morning, School Leader" : "Good morning, Teacher"}
      subtitle={`${schoolName} · ${currentTimeLabel()}`} action={<button className="korva-primary-button" onClick={() => onNavigate("attendance")}><ClipboardCheck size={16} />Open attendance</button>} />
    <div className="korva-context-strip"><div className="korva-context-crest"><SvgMark size={27} /></div><div><strong>{schoolName}</strong><span>Academic year 2026 <b>·</b> Term 3 <b>·</b> Sierra Leone</span></div><Badge tone="success">Active school</Badge><span className="korva-context-right">{leader ? "School leader workspace" : "Assigned class workspace"}</span></div>
    <div className="korva-section-heading"><div><h2>{leader ? "Today at a glance" : "Your teaching day"}</h2><p>{leader ? "A quick view of your school's daily pulse." : "Your assigned classes and today's activity."}</p></div><button className="korva-text-button" onClick={() => onNavigate("students")}>View student records <ArrowRight size={15} /></button></div>
    <div className={`korva-metrics ${teacher ? "teacher-metrics" : ""}`}>
      <Metric label={teacher ? "My students" : "Enrolled students"} value={teacher ? data.students.filter((student) => data.classes.find((item) => item.id === student.classId)?.teacherIds.includes("teacher-1")).length : data.students.length} detail={teacher ? "Across 2 assigned classes" : "Across all active classes"} icon={Users} trend="4.2%" tone="blue" />
      <Metric label="Teachers" value={teacher ? "2 classes" : "6"} detail={teacher ? "On your timetable today" : "5 present today"} icon={GraduationCap} tone="gold" />
      <Metric label="Attendance today" value={attendanceSummary.rate === null ? "—" : `${attendanceSummary.rate}%`} detail={attendanceSummary.registers ? `${attendanceSummary.registers} register${attendanceSummary.registers === 1 ? "" : "s"} submitted` : "No registers submitted yet"} icon={ClipboardCheck} trend={attendanceSummary.registers ? undefined : undefined} tone="green" />
      {leader && <Metric label="Verified fees" value={formatMoney(verifiedFees)} detail="of Le 4,000 invoiced · demo figures" icon={Wallet} tone="purple" />}
      {teacher && <Metric label="Pending work" value="3" detail="1 assignment · 2 registers" icon={Clock3} tone="purple" />}
    </div>

    <div className="korva-dashboard-columns">
      <section className="korva-panel korva-quick-panel">
        <div className="korva-panel-heading"><div><h2>Quick actions</h2><p>Pick up where your school day needs you.</p></div><Sparkles size={18} /></div>
        <div className="korva-quick-grid">
          {leader && <button onClick={onAddStudent}><span className="korva-quick-icon gold"><UserRound size={18} /></span><span><strong>Add student</strong><small>Register a learner</small></span><ArrowRight size={15} /></button>}
          <button onClick={() => onNavigate("attendance")}><span className="korva-quick-icon blue"><ClipboardCheck size={18} /></span><span><strong>Take attendance</strong><small>Open a class register</small></span><ArrowRight size={15} /></button>
          <button onClick={() => onNavigate("students")}><span className="korva-quick-icon green"><Users size={18} /></span><span><strong>Find a student</strong><small>Search school records</small></span><ArrowRight size={15} /></button>
          <button className="planned" onClick={() => onNavigate("assessments")}><span className="korva-quick-icon purple"><FileCheck2 size={18} /></span><span><strong>Enter assessment scores</strong><small>Planned module</small></span><Badge>Planned</Badge></button>
        </div>
      </section>
      <section className="korva-panel korva-workload-panel">
        <div className="korva-panel-heading"><div><h2>{leader ? "School workload" : "My class groups"}</h2><p>{leader ? "A simple view of active groups." : "Classes assigned to your demo role."}</p></div><button className="korva-icon-button subtle" aria-label="More workload options"><MoreHorizontal size={19} /></button></div>
        <div className="korva-class-list">{(teacher ? classCounts.filter((item) => item.teacherIds.includes("teacher-1")) : classCounts).map((item, index) => <button key={item.id} className="korva-class-row" onClick={() => onNavigate("students")}>
          <span className={`korva-class-icon c${index + 1}`}><School size={17} /></span><span className="korva-class-text"><strong>{item.name}</strong><small>{teacher ? "Class teacher: You" : "Class teacher: Mr. K. Sesay"}</small></span><span className="korva-class-total">{item.count}<small>students</small></span><ArrowRight size={15} />
        </button>)}</div>
        {!classCounts.length && <div className="korva-empty-small">No classes set up in this demo school yet.</div>}
        <button className="korva-panel-link" onClick={() => onNavigate("classes")}>Manage classes <ArrowRight size={15} /></button>
      </section>
    </div>
    <div className="korva-dashboard-columns lower">
      <section className="korva-panel">
        <div className="korva-panel-heading"><div><h2>Recent activity</h2><p>Recent sample events for this school.</p></div><Activity size={18} /></div>
        <div className="korva-activity-list">{data.activity.slice(0, 4).map((item, index) => <div className="korva-activity-item" key={item.id}><span className={`korva-activity-dot a${index}`}><CheckCircle2 size={14} /></span><div><strong>{item.message}</strong><small>{item.actor} <i>·</i> {formatRelative(item.at)}</small></div></div>)}</div>
      </section>
      <section className="korva-panel">
        <div className="korva-panel-heading"><div><h2>{leader ? "Needs your attention" : "Coming up"}</h2><p>{leader ? "Keep an eye on these school tasks." : "A few items for your day."}</p></div><CircleAlert size={18} /></div>
        <div className="korva-attention-list">
          {leader && <button onClick={() => onNavigate("finance")}><span className="korva-attention-icon amber"><Wallet size={17} /></span><span><strong>{pendingVerification} payment awaiting verification</strong><small>Keep unverified payments pending</small></span><ArrowRight size={15} /></button>}
          {pendingCount > 0 && <button onClick={() => onNavigate("sync")}><span className="korva-attention-icon blue"><Cloud size={17} /></span><span><strong>{pendingCount} local change{pendingCount === 1 ? "" : "s"} stored here</strong><small>Not uploaded; the planned sync module is inactive</small></span><ArrowRight size={15} /></button>}
          <button onClick={() => onNavigate("assessments")}><span className="korva-attention-icon purple"><FileCheck2 size={17} /></span><span><strong>Term 3 reports are in progress</strong><small>Results are not published in this demo</small></span><Badge tone="warning">Review</Badge></button>
        </div>
      </section>
    </div>
    <p className="korva-demo-footnote"><Shield size={14} /> All numbers and activity above are fictional examples. No real student, attendance, or payment information is stored.</p>
  </>;
}

function formatRelative(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Sample date";
  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(value.slice(0, 10));
}

function StudentsPage({ students, search, setSearch, className, canRegister, onAdd, onOpen, onReset }: {
  students: DemoStudent[]; search: string; setSearch: (value: string) => void; className: (id: string) => string;
  canRegister: boolean; onAdd: () => void; onOpen: (student: DemoStudent) => void; onReset: () => void;
}) {
  return <>
    <PageHeading eyebrow="SCHOOL RECORDS" title="Students" subtitle="Open a learner’s record to explore their dated school journey." action={canRegister ? <button className="korva-primary-button" onClick={onAdd}><UserRound size={16} />Add student</button> : undefined} />
    <div className="korva-inline-banner"><Shield size={16} /><span>This directory contains fictional demo records only. Role boundaries here demonstrate the interface and do not secure real records.</span></div>
    <section className="korva-panel korva-students-panel">
      <div className="korva-table-toolbar"><div><h2>Student directory <span className="korva-count-pill">{students.length}</span></h2><p>Search by student name, ID, class, or guardian.</p></div><label className="korva-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student records" aria-label="Search students" /></label></div>
      <div className="korva-table-scroll"><table className="korva-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS</th><th>GUARDIAN</th><th>STATUS</th><th>ENROLLED</th><th></th></tr></thead><tbody>
        {students.map((item, index) => <tr key={item.id} onClick={() => onOpen(item)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(item); } }}>
          <td><span className={`korva-student-avatar s${index % 5}`}>{initials(item.name)}</span><strong>{item.name}</strong></td><td className="korva-mono">{item.id}</td><td><span className="korva-class-chip">{className(item.classId)}</span></td><td>{item.guardian}</td><td><Badge tone="success">{item.status}</Badge></td><td>{formatDate(item.admitted)}</td><td><button className="korva-row-open" aria-label={`Open ${item.name} record`} onClick={(event) => { event.stopPropagation(); onOpen(item); }}><ArrowRight size={17} /></button></td>
        </tr>)}
        {!students.length && <tr><td colSpan={7}><div className="korva-empty-state"><Search size={24} /><strong>No matching students</strong><span>Try another search term or clear your search.</span><button className="korva-text-button" onClick={() => setSearch("")}>Clear search</button></div></td></tr>}
      </tbody></table></div>
      <div className="korva-table-footer"><span>Showing <strong>{students.length}</strong> fictional student records</span><button className="korva-text-button" onClick={onReset}><RotateCcw size={14} />Reset demo data</button></div>
    </section>
    <p className="korva-demo-footnote"><Shield size={14} /> Demo data is stored only in this browser. This table is not connected to the KORVA database.</p>
  </>;
}

function StudentPanel({ student, data, role, onClose }: { student: DemoStudent; data: DemoSchoolData; role: DemoRole; onClose: () => void }) {
  const enrolled = data.classes.find((item) => item.id === student.classId)?.name ?? "Unassigned";
  const allowedReports = student.reports.filter((item) => item.published);
  const orderedEvents = [...student.events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  return <div className="korva-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="korva-student-drawer" role="dialog" aria-modal="true" aria-label={`${student.name} student record`}>
      <div className="korva-drawer-top"><span className="korva-eyebrow">STUDENT PROFILE <i>·</i> DEMO RECORD</span><button className="korva-icon-button" onClick={onClose} aria-label="Close student record"><X size={20} /></button></div>
      <div className="korva-student-profile"><span className="korva-profile-photo">{initials(student.name)}</span><div><div className="korva-profile-title"><h2>{student.name}</h2><Badge tone="success">{student.status}</Badge></div><p>{student.id} <i>·</i> {enrolled}</p></div></div>
      <div className="korva-profile-meta"><div><span>ENROLLMENT DATE</span><strong>{formatDate(student.admitted)}</strong></div><div><span>GUARDIAN</span><strong>{student.guardian}</strong><small>Relationship not verified outside this demo</small></div><div><span>CLASS / STREAM</span><strong>{enrolled}</strong></div><div><span>ACADEMIC YEAR</span><strong>2026 · Term 3</strong></div></div>
      <div className="korva-drawer-notice"><Shield size={15} /> Showing fictional data permitted by the selected {ROLE_META[role].label.toLowerCase()} demo role. Real school membership checks are not implemented here.</div>
      <section className="korva-record-section"><div className="korva-record-title"><h3>Attendance overview</h3><span className="korva-count-pill">Recent sample days</span></div>
        <div className="korva-attendance-strip">{student.attendance.slice(-4).map((row) => <div key={row.date}><span>{new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(`${row.date}T12:00:00`))}</span><b className={`mark-${row.mark}`}>{row.mark}</b><small>{formatDate(row.date).split(" ")[0]}</small></div>)}</div>
        <p className="korva-data-caption">Sample attendance events only. A blank day is not treated as absent.</p>
      </section>
      <section className="korva-record-section"><div className="korva-record-title"><h3>Published report highlights</h3><span className="korva-count-pill">{allowedReports.length} subjects</span></div>
        {allowedReports.map((item) => <div className="korva-report-row" key={item.subject}><span className="korva-report-icon"><BookOpen size={15} /></span><span><strong>{item.subject}</strong><small>{item.term} · Published 14 Aug 2026</small></span><b>{item.score}%</b></div>)}
        {student.reports.some((item) => !item.published) && <div className="korva-unpublished-note"><Shield size={14} /> A Term 3 assessment is still in review and is not shown as a result.</div>}
      </section>
      {role === "principal" && <section className="korva-record-section"><div className="korva-record-title"><h3>Finance summary</h3><Badge tone="warning">Demo only</Badge></div><div className="korva-finance-summary"><span>Term 3 fees</span><strong>{formatMoney(500)}</strong><small>Illustrative invoice · payment not verified</small></div></section>}
      <section className="korva-record-section"><div className="korva-record-title"><h3>Dated student history</h3><span className="korva-count-pill">{orderedEvents.length} entries</span></div>
        <div className="korva-timeline">{orderedEvents.map((event) => <article key={event.id} className="korva-timeline-event"><span className="korva-timeline-dot" /><div><span className="korva-event-kind">{event.kind}</span><h4>{event.title}</h4><p>{event.detail}</p><div className="korva-event-dates"><span><CalendarDays size={12} /> Happened {formatDate(event.eventDate)}</span><span><Clock3 size={12} /> Recorded {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(event.recordedAt))}</span></div></div></article>)}</div>
      </section>
      <div className="korva-drawer-footer"><span>Student data is fictional and local to this browser.</span><button className="korva-secondary-button" onClick={onClose}>Close record</button></div>
    </section>
  </div>;
}

function AttendancePage({ data, role, classFilter, setClassFilter, marks, setMarks, correctionReason, setCorrectionReason, online, pendingCount, onStart, onSubmit }: {
  data: DemoSchoolData; role: DemoRole; classFilter: string; setClassFilter: (value: string) => void;
  marks: Record<string, AttendanceMark>; setMarks: (value: Record<string, AttendanceMark>) => void;
  correctionReason: string; setCorrectionReason: (value: string) => void; online: boolean; pendingCount: number;
  onStart: () => void; onSubmit: () => void;
}) {
  const allowedClassIds = role === "teacher" ? data.classes.filter((item) => item.teacherIds.includes("teacher-1")).map((item) => item.id) : data.classes.map((item) => item.id);
  const classes = data.classes.filter((item) => allowedClassIds.includes(item.id));
  const students = data.students.filter((item) => item.classId === classFilter && allowedClassIds.includes(item.classId));
  const today = dateKey();
  const existing = data.attendance.find((item) => item.date === today && item.classId === classFilter);
  const unmarked = students.filter((item) => !marks[item.id]).length;
  return <>
    <PageHeading eyebrow="SCHOOL RECORDS" title="Attendance" subtitle="A clear register for every class, every school day." action={<button className="korva-secondary-button" onClick={onStart}><RotateCcw size={15} />Load saved marks</button>} />
    <div className={`korva-connectivity-banner ${online ? "connected" : "disconnected"}`}><span className="korva-connectivity-icon">{online ? <Cloud size={18} /> : <CircleAlert size={18} />}</span><div><strong>{online ? "You’re online · browser demo only" : "You’re offline · local edits stay here"}</strong><span>{online ? "Changes remain in this browser; no server sync is attempted." : "Demo attendance can be saved locally and remains here after reconnecting; it is not uploaded."}</span></div>{pendingCount > 0 && <Badge tone="warning">{pendingCount} saved locally</Badge>}</div>
    <section className="korva-panel korva-register-panel">
      <div className="korva-register-toolbar"><div><p className="korva-eyebrow">DAILY CLASS REGISTER</p><h2>Mark student attendance</h2><span>{currentTimeLabel()} <i>·</i> {students.length} students in the selected class</span></div><label className="korva-class-select"><span>CLASS</span><select aria-label="Select class" value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setMarks({}); }}>
        {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label></div>
      {!students.length ? <div className="korva-empty-state"><Users size={24} /><strong>No students in this class</strong><span>Choose a different class or add a fictional student from the directory.</span></div> : <>
        <div className="korva-register-summary"><span><CheckCircle2 size={15} />{Object.keys(marks).length} of {students.length} marked</span><span>{unmarked ? `${unmarked} still need a mark` : "All students marked"}</span>{existing && <Badge tone={existing.status === "Submitted" ? "success" : "warning"}>{existing.status === "Submitted" ? "Saved in this browser" : "Saved offline · not uploaded"}</Badge>}</div>
        <div className="korva-register-list">{students.map((item, index) => <div key={item.id} className="korva-register-row"><span className={`korva-student-avatar s${index % 5}`}>{initials(item.name)}</span><span className="korva-register-student"><strong>{item.name}</strong><small>{item.id}</small></span><div className="korva-mark-selector" role="radiogroup" aria-label={`Attendance status for ${item.name}`}>
          {MARKS.map((mark) => <button type="button" key={mark.key} aria-pressed={marks[item.id] === mark.key} className={marks[item.id] === mark.key ? `selected ${mark.key.toLowerCase()}` : ""} onClick={() => setMarks({ ...marks, [item.id]: mark.key })}><span>{mark.short}</span><small>{mark.label}</small></button>)}
        </div></div>)}</div>
        {existing && <label className="korva-correction-field"><span>Reason for correction <b>*</b></span><input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Explain why this submitted register is being corrected" /></label>}
        <div className="korva-register-bottom"><span>{existing ? "Changes to a submitted register are recorded in this demo activity history." : "Unmarked students are not automatically recorded as absent."}</span><button className="korva-primary-button" onClick={onSubmit} disabled={unmarked > 0 || Boolean(existing && correctionReason.trim().length < 6)}><Check size={16} />{existing ? "Save correction" : "Submit register"}</button></div>
      </>}
    </section>
    <p className="korva-demo-footnote"><Shield size={14} /> {existing ? `Saved status: ${existing.status}.` : "For this demo, attendance records are fictional and saved in browser storage only."} No school server or cross-device sync is connected.</p>
  </>;
}

function AddStudentDialog({ data, name, setName, guardian, setGuardian, classId, setClassId, error, duplicateConfirm, onCancel, onSave }: {
  data: DemoSchoolData; name: string; setName: (value: string) => void; guardian: string; setGuardian: (value: string) => void;
  classId: string; setClassId: (value: string) => void; error: string; duplicateConfirm: boolean; onCancel: () => void; onSave: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);
  return <div className="korva-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="korva-modal" role="dialog" aria-modal="true" aria-labelledby="add-student-title">
      <div className="korva-modal-header"><span className="korva-quick-icon gold"><UserRound size={19} /></span><button className="korva-icon-button" onClick={onCancel} aria-label="Close dialog"><X size={19} /></button></div>
      <p className="korva-eyebrow">STUDENT RECORD · DEMO</p><h2 id="add-student-title">Register a student</h2><p className="korva-modal-copy">Add a fictional record to this browser-only sample school.</p>
      <label className="korva-form-field"><span>Full name <b>*</b></span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter student's full name" /></label>
      <label className="korva-form-field"><span>Class / stream <b>*</b></span><select value={classId} onChange={(event) => setClassId(event.target.value)}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="korva-form-field"><span>Guardian name <b>*</b></span><input value={guardian} onChange={(event) => setGuardian(event.target.value)} placeholder="Enter parent or guardian name" /></label>
      <div className="korva-form-hint"><Shield size={14} /> Guardian relationship is not verified in this demo.</div>
      {error && <p className={`korva-form-error ${duplicateConfirm ? "duplicate" : ""}`} role="alert"><CircleAlert size={15} />{error}</p>}
      <div className="korva-modal-actions"><button className="korva-secondary-button" onClick={onCancel}>Cancel</button><button className="korva-primary-button" onClick={onSave}>{duplicateConfirm ? "Add anyway" : "Save student"}</button></div>
    </section>
  </div>;
}

function PlannedPage({ page, onNavigate }: { page: PageId; onNavigate: (page: PageId) => void }) {
  const meta = PAGE_META[page] ?? { title: "School module", note: "Additional school workflows are planned for a later phase." };
  const item = NAV_ITEMS.find((nav) => nav.id === page);
  const Icon = iconMap[page] ?? BriefcaseBusiness;
  return <>
    <PageHeading eyebrow={item?.group.toUpperCase() ?? "SCHOOL WORKSPACE"} title={meta.title} subtitle={meta.note} />
    <div className="korva-planned-card"><span className="korva-planned-icon"><Icon size={24} /></span><Badge tone="gold">Planned for phase {item && "phase" in item ? item.phase : "later"}</Badge><h2>This module isn’t active in the demo</h2><p>The KORVA reference includes this workflow, but there is no working demo screen for it yet. It is intentionally labelled as planned rather than shown as real school functionality.</p>
      <div className="korva-planned-features"><span><CheckCircle2 size={15} />Role-scoped access is part of the intended design</span><span><CheckCircle2 size={15} />Approvals and dated history are planned</span><span><CircleAlert size={15} />No real data or external connection is active here</span></div>
      <button className="korva-secondary-button" onClick={() => onNavigate("dashboard")}>Return to dashboard <ArrowRight size={15} /></button>
    </div>
  </>;
}

function PlatformSchools({ state }: { state: DemoState }) {
  return <>
    <PageHeading eyebrow="KORVA PLATFORM" title="Schools" subtitle="Tenant overview for the platform operations workspace." />
    <div className="korva-inline-banner"><Shield size={16} /><span>Platform view is aggregate-only in this demo. It cannot open student names or individual school records.</span></div>
    <div className="korva-metrics platform-metrics"><Metric label="School tenants" value={Object.keys(state.schools).length} detail="Fictional demo workspaces" icon={School} tone="blue" /><Metric label="Active schools" value="1" detail="One active example tenant" icon={CheckCircle2} tone="green" /><Metric label="Schools in setup" value="1" detail="Not yet activated" icon={Settings2} tone="gold" /></div>
    <section className="korva-panel korva-students-panel"><div className="korva-table-toolbar"><div><h2>Tenant directory</h2><p>Platform support sees operational totals only.</p></div></div><div className="korva-table-scroll"><table className="korva-table"><thead><tr><th>SCHOOL</th><th>TENANT STATUS</th><th>STUDENTS</th><th>CLASSES</th><th>DATA ACCESS</th></tr></thead><tbody>
      {SCHOOLS.map((item) => <tr key={item.id}><td><span className="korva-school-table-icon"><School size={16} /></span><strong>{item.name}</strong></td><td><Badge tone={item.status === "Active" ? "success" : "warning"}>{item.status}</Badge></td><td>{state.schools[item.id].students.length} fictional</td><td>{state.schools[item.id].classes.length}</td><td><span className="korva-aggregate-access"><Shield size={14} /> Aggregate only</span></td></tr>)}
    </tbody></table></div></section>
    <p className="korva-demo-footnote"><Shield size={14} /> This console is a front-end role demonstration; it does not provision or manage real school tenants.</p>
  </>;
}
