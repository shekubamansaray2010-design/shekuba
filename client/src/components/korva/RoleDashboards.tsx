import {
  Activity, ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck,
  Clock3, FileCheck2, GraduationCap, School, Shield, UserRound, Users, Wallet,
} from "lucide-react";
import type { AttendanceMark, DemoRole, DemoSchoolData, DemoStudent } from "@/lib/korva-demo";
import { NAV_ITEMS, ROLE_META, formatDate, formatMoney } from "@/lib/korva-demo";

type PageId = (typeof NAV_ITEMS)[number]["id"] | "schools";
type AttendanceSummary = { registers: number; marked: number; present: number; rate: number | null };
type Props = {
  data: DemoSchoolData;
  schoolName: string;
  role: DemoRole;
  attendanceSummary: AttendanceSummary;
  pendingCount: number;
  pendingVerification: number;
  verifiedFees: number;
  onNavigate: (page: PageId) => void;
  onAddStudent: () => void;
  onOpenPersonal: () => void;
};

type Kpi = { label: string; value: string | number; detail: string; icon: typeof Users; tone: "blue" | "gold" };
type QuickAction = { title: string; detail: string; icon: typeof Users; page: PageId; planned?: boolean; onClick?: () => void };

function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="korva-page-heading"><div><p className="korva-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="korva-subtitle">{subtitle}</p></div></div>;
}

function BrandMark() {
  return <svg width="44" height="44" viewBox="0 0 32 32" aria-hidden="true"><path d="M2 20 16 4l14 16-8-3-6 9-6-9z" fill="currentColor" /></svg>;
}

function SchoolMasthead({ schoolName, role, focus }: { schoolName: string; role: DemoRole; focus: string }) {
  return <section className="korva-school-masthead">
    <div className="korva-masthead-crest"><BrandMark /></div>
    <div className="korva-masthead-copy"><span>KORVA SCHOOL WORKSPACE</span><strong>{schoolName}</strong><em>Dirigenos in Veritate</em></div>
    <div className="korva-masthead-art" aria-hidden="true"><span className="korva-campus-sun" /><span className="korva-campus-building"><i /><i /><i /><i /><b /></span></div>
    <div className="korva-masthead-role"><b>{ROLE_META[role].label}</b><span>{focus}</span><small>ACADEMIC YEAR 2026 · TERM 3</small></div>
  </section>;
}

function KpiBand({ items }: { items: Kpi[] }) {
  return <section className="korva-kpi-band" aria-label="Role-specific summary">
    {items.map((item, index) => <article key={item.label} className={`korva-kpi-card ${item.tone} kpi-${index + 1}`}>
      <span className="korva-kpi-icon"><item.icon size={25} strokeWidth={1.8} /></span>
      <span className="korva-kpi-copy"><small>{item.label}</small><strong>{item.value}</strong><em>{item.detail}</em></span>
    </article>)}
  </section>;
}

function Panel({ title, eyebrow, icon: Icon, children, className = "" }: { title: string; eyebrow?: string; icon: typeof Activity; children: React.ReactNode; className?: string }) {
  return <section className={`korva-reference-panel ${className}`}>
    <div className="korva-reference-panel-head"><div>{eyebrow && <small>{eyebrow}</small>}<h2><Icon size={17} />{title}</h2></div></div>
    {children}
  </section>;
}

function PerformancePanel({ title = "Academic performance overview" }: { title?: string }) {
  return <Panel title={title} eyebrow="ILLUSTRATIVE SAMPLE TREND" icon={Activity} className="korva-performance-panel">
    <div className="korva-chart-legend"><span><i className="school" />School average</span><span><i className="class" />Class average</span><span><i className="target" />Target (70%)</span></div>
    <svg className="korva-performance-chart" viewBox="0 0 600 236" role="img" aria-label="Fictional school and class performance trend across six weeks">
      <g className="korva-chart-grid"><line x1="48" y1="26" x2="580" y2="26" /><line x1="48" y1="65" x2="580" y2="65" /><line x1="48" y1="104" x2="580" y2="104" /><line x1="48" y1="143" x2="580" y2="143" /><line x1="48" y1="182" x2="580" y2="182" /></g>
      <g className="korva-chart-axis"><text x="8" y="30">100%</text><text x="16" y="69">80%</text><text x="16" y="108">60%</text><text x="16" y="147">40%</text><text x="16" y="186">20%</text></g>
      <line className="korva-chart-target" x1="48" y1="84" x2="580" y2="84" />
      <polyline className="korva-chart-school" points="50,62 155,55 260,47 365,40 470,33 575,27" />
      <polyline className="korva-chart-class" points="50,72 155,65 260,58 365,52 470,47 575,41" />
      {[50,155,260,365,470,575].map((x, index) => <g key={x}><circle className="korva-chart-dot school" cx={x} cy={[62,55,47,40,33,27][index]} r="4.2" /><circle className="korva-chart-dot class" cx={x} cy={[72,65,58,52,47,41][index]} r="4.2" /><text className="korva-chart-week" x={x} y="211" textAnchor="middle">Week {index + 1}</text></g>)}
    </svg>
    <p className="korva-chart-footnote"><Shield size={13} /> Fictional sample trend — not a real examination report.</p>
  </Panel>;
}

function LeaderboardPanel({ students }: { students: DemoStudent[] }) {
  const ranks = [94, 92, 89];
  return <Panel title="School leaderboard" eyebrow="SAMPLE PREVIEW" icon={GraduationCap} className="korva-leaderboard-panel">
    <div className="korva-leader-tabs"><span className="active">Students</span><span>Classes</span><span>Subjects</span></div>
    <div className="korva-leader-list">{students.slice(0, 3).map((student, index) => <article className={`korva-leader-row rank-${index + 1}`} key={student.id}>
      <span className="korva-leader-rank">{index + 1}</span><span className="korva-leader-avatar">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
      <span className="korva-leader-name"><strong>{student.name}</strong><small>{student.id} · sample record</small></span><b>{ranks[index]}%</b>
    </article>)}</div>
    <p className="korva-panel-disclaimer">Fictional example rankings. Results and leaderboards are not published from this demo.</p>
  </Panel>;
}

function QuickActions({ title = "Quick actions", actions, onNavigate }: { title?: string; actions: QuickAction[]; onNavigate: Props["onNavigate"] }) {
  return <Panel title={title} eyebrow="YOUR NEXT STEPS" icon={CheckCircle2} className="korva-quick-actions-panel">
    <div className="korva-reference-actions">{actions.map((action) => <button key={action.title} className={`korva-reference-action ${action.planned ? "planned" : ""}`} onClick={action.onClick ?? (() => onNavigate(action.page))}>
      <span className="korva-action-icon"><action.icon size={20} /></span><span><strong>{action.title}</strong><small>{action.planned ? "Planned module" : action.detail}</small></span><ArrowRight size={15} />
    </button>)}</div>
  </Panel>;
}

function ClassPerformance({ data }: { data: DemoSchoolData }) {
  const samples = [86, 82, 79, 76];
  return <Panel title="Class performance" eyebrow="ILLUSTRATIVE SNAPSHOT" icon={GraduationCap} className="korva-class-performance">
    <div className="korva-class-bars">{data.classes.slice(0, 4).map((item, index) => <div className="korva-class-bar-row" key={item.id}>
      <span className={`korva-class-rank r${index + 1}`}>{index + 1}</span><span className="korva-class-bar-label"><strong>{item.name}</strong><span><i style={{ width: `${samples[index]}%` }} /></span></span><b>{samples[index]}.{index % 3}%</b>
    </div>)}</div>
    <p className="korva-panel-disclaimer">Sample percentages only; no real marks are stored.</p>
  </Panel>;
}

function ActivityPanel({ data, title = "Recent activity" }: { data: DemoSchoolData; title?: string }) {
  return <Panel title={title} eyebrow="SCHOOL DAY" icon={Bell} className="korva-role-activity">
    <div className="korva-role-activity-list">{data.activity.slice(0, 4).map((item, index) => <div className="korva-role-activity-item" key={item.id}><span className={`dot d${index}`}><CheckCircle2 size={14} /></span><span><strong>{item.message}</strong><small>{item.actor} · {relativeTime(item.at)}</small></span></div>)}</div>
  </Panel>;
}

function BrandPanel() {
  return <section className="korva-brand-promo"><span className="korva-promo-mark"><BrandMark /></span><span className="korva-promo-kicker">KORVA · SIERRA LEONE</span><strong>RISE. LEARN. LEAD.</strong><p>A clearer school day, shaped around every role.</p><span className="korva-promo-pill">One school · one connected community</span></section>;
}

function QueuePanel({ title, icon: Icon, rows, empty }: { title: string; icon: typeof Activity; rows: { title: string; detail: string; status: string }[]; empty?: string }) {
  return <Panel title={title} icon={Icon} className="korva-task-queue">
    {rows.length ? <div className="korva-task-rows">{rows.map((row) => <div key={row.title} className="korva-task-row"><span><strong>{row.title}</strong><small>{row.detail}</small></span><b>{row.status}</b></div>)}</div> : <p className="korva-empty-task">{empty ?? "No sample tasks are waiting right now."}</p>}
  </Panel>;
}

function OwnerDashboard(props: Props) {
  const { data, schoolName, attendanceSummary, onNavigate } = props;
  return <>
    <Heading eyebrow="SCHOOL OWNER · OVERVIEW" title="Your school, at a glance" subtitle="School-wide direction, resources, and outcomes — not a classroom task list." />
    <SchoolMasthead schoolName={schoolName} role="owner" focus="School-wide oversight" />
    <KpiBand items={[
      { label: "Total students", value: data.students.length, detail: "Across active classes", icon: Users, tone: "blue" },
      { label: "Teachers", value: 6, detail: "Staffing overview · sample", icon: GraduationCap, tone: "gold" },
      { label: "Total classes", value: data.classes.length, detail: "Configured in this sample", icon: BookOpen, tone: "blue" },
      { label: "Attendance today", value: attendanceSummary.rate === null ? "—" : `${attendanceSummary.rate}%`, detail: "School-level sample", icon: CalendarDays, tone: "blue" },
      { label: "Fees collected", value: formatMoney(props.verifiedFees), detail: "Illustrative figures", icon: Wallet, tone: "gold" },
    ]} />
    <div className="korva-reference-grid owner-grid"><PerformancePanel /><LeaderboardPanel students={data.students} /><QuickActions actions={[
      { title: "Review school analytics", detail: "School-wide trends", page: "analytics", planned: true, icon: Activity },
      { title: "Staff & class coverage", detail: "School team", page: "staff", planned: true, icon: GraduationCap },
      { title: "School settings", detail: "Academic structure", page: "settings", planned: true, icon: School },
    ]} onNavigate={onNavigate} /></div>
    <div className="korva-reference-lower"><ClassPerformance data={data} /><ActivityPanel data={data} /><BrandPanel /></div>
  </>;
}

function PrincipalDashboard(props: Props) {
  const { data, schoolName, attendanceSummary, onNavigate } = props;
  return <>
    <Heading eyebrow="PRINCIPAL · ACADEMIC OVERSIGHT" title="Good morning, Principal" subtitle="Keep teaching, attendance, and school follow-up moving together." />
    <SchoolMasthead schoolName={schoolName} role="principal" focus="Learning and school oversight" />
    <KpiBand items={[
      { label: "Attendance today", value: attendanceSummary.rate === null ? "—" : `${attendanceSummary.rate}%`, detail: `${attendanceSummary.registers} class registers`, icon: ClipboardCheck, tone: "blue" },
      { label: "Classes reporting", value: `${attendanceSummary.registers}/${data.classes.length}`, detail: "Registers received", icon: School, tone: "gold" },
      { label: "Student records", value: data.students.length, detail: "School-wide directory", icon: Users, tone: "blue" },
      { label: "Reviews to check", value: props.pendingVerification, detail: "Illustrative approval queue", icon: FileCheck2, tone: "gold" },
    ]} />
    <div className="korva-reference-grid principal-grid"><PerformancePanel title="Academic progress overview" /><QueuePanel title="Principal’s follow-up" icon={Clock3} rows={[
      { title: "Review class attendance", detail: "Check submitted registers before close of day", status: "Today" },
      { title: "Term 3 results", detail: "Score entry is a planned module", status: "Planned" },
      { title: "School notices", detail: "Communication tools are planned", status: "Planned" },
    ]} /><QuickActions actions={[
      { title: "Review student records", detail: "Open school directory", page: "students", icon: Users },
      { title: "Check attendance", detail: "Review and submit registers", page: "attendance", icon: ClipboardCheck },
      { title: "Review results", detail: "Marks and reports", page: "results", planned: true, icon: FileCheck2 },
    ]} onNavigate={onNavigate} /></div>
    <div className="korva-reference-lower"><ClassPerformance data={data} /><ActivityPanel data={data} title="School activity" /><BrandPanel /></div>
  </>;
}

function AdminDashboard(props: Props) {
  const { data, schoolName, onNavigate } = props;
  return <>
    <Heading eyebrow="SCHOOL ADMINISTRATOR · OPERATIONS" title="School operations desk" subtitle="Keep student records, school routines, and staff coordination in order." />
    <SchoolMasthead schoolName={schoolName} role="school_admin" focus="Daily school operations" />
    <KpiBand items={[
      { label: "Active student records", value: data.students.length, detail: "Fictional learner records", icon: Users, tone: "blue" },
      { label: "Classes set up", value: `${data.classes.length}`, detail: "Class tools · sample", icon: School, tone: "gold" },
      { label: "New enrollments", value: 3, detail: "Illustrative this term", icon: UserRound, tone: "blue" },
      { label: "Operations tasks", value: 4, detail: "Sample follow-up list", icon: CheckCircle2, tone: "gold" },
    ]} />
    <div className="korva-reference-grid admin-grid"><QueuePanel title="Today’s operations" icon={CheckCircle2} rows={[
      { title: "Review new learner records", detail: "Confirm fields are complete", status: "2 to check" },
      { title: "Prepare class registers", detail: "Class configuration screen planned", status: "Planned" },
      { title: "Coordinate staff cover", detail: "Staff module planned", status: "Planned" },
    ]} /><QuickActions actions={[
      { title: "Register a student", detail: "Add a fictional learner record", page: "students", icon: UserRound, onClick: props.onAddStudent },
      { title: "Find student record", detail: "Search permitted records", page: "students", icon: Users },
      { title: "Staff & coverage", detail: "Coordinate school team", page: "staff", planned: true, icon: GraduationCap },
    ]} onNavigate={onNavigate} /><ActivityPanel data={data} title="Operations activity" /></div>
    <div className="korva-reference-lower admin-lower"><ClassPerformance data={data} /><BrandPanel /></div>
  </>;
}

function AdmissionsDashboard(props: Props) {
  const { data, schoolName, onNavigate } = props;
  return <>
    <Heading eyebrow="ADMISSIONS OFFICER · ENROLLMENT" title="Admissions desk" subtitle="Guide prospective learners from first contact to an enrolled, dated student record." />
    <SchoolMasthead schoolName={schoolName} role="admissions" focus="Learner intake and enrollment" />
    <KpiBand items={[
      { label: "New applications", value: 12, detail: "Illustrative sample queue", icon: Users, tone: "blue" },
      { label: "Records to complete", value: 4, detail: "Example intake status", icon: Clock3, tone: "gold" },
      { label: "Enrolled this term", value: 3, detail: "Fictional sample count", icon: CheckCircle2, tone: "blue" },
      { label: "Guardian links", value: "Demo only", detail: "Not independently verified", icon: Shield, tone: "gold" },
    ]} />
    <div className="korva-reference-grid admissions-grid"><QueuePanel title="Enrollment journey" icon={UserRound} rows={[
      { title: "New inquiry", detail: "Capture prospective learner details", status: "12 sample" },
      { title: "Application review", detail: "Check submitted information", status: "4 sample" },
      { title: "Enrollment record", detail: "Create dated student profile", status: "Ready" },
    ]} /><QuickActions actions={[
      { title: "Register a learner", detail: "Create a dated demo record", page: "students", icon: UserRound, onClick: props.onAddStudent },
      { title: "Search student records", detail: "Find an enrolled learner", page: "students", icon: Users },
      { title: "Admissions pipeline", detail: "Applicant review flow", page: "applicants", planned: true, icon: FileCheck2 },
    ]} onNavigate={onNavigate} /><ActivityPanel data={data} title="Recent enrollments" /></div>
    <div className="korva-inline-banner"><Shield size={15} /><span>Guardian links and application counts are fictional. This demo does not verify documents, identity, or guardian relationships.</span></div>
  </>;
}

function TeacherDashboard(props: Props) {
  const assignedClasses = props.data.classes.filter((item) => item.teacherIds.includes("teacher-1"));
  const assignedStudents = props.data.students.filter((student) => assignedClasses.some((item) => item.id === student.classId));
  return <>
    <Heading eyebrow="TEACHER · MY CLASSROOM" title="Your teaching day" subtitle="Start with your assigned classes, attendance register, and learning work." />
    <SchoolMasthead schoolName={props.schoolName} role="teacher" focus="Assigned classes and learning" />
    <KpiBand items={[
      { label: "My students", value: assignedStudents.length, detail: "Only assigned class groups", icon: Users, tone: "blue" },
      { label: "My classes", value: assignedClasses.length, detail: "Assigned in this demo", icon: School, tone: "gold" },
      { label: "Attendance today", value: props.attendanceSummary.rate === null ? "—" : `${props.attendanceSummary.rate}%`, detail: "For your assigned register", icon: ClipboardCheck, tone: "blue" },
      { label: "Teaching tasks", value: 3, detail: "Illustrative class workload", icon: Clock3, tone: "gold" },
    ]} />
    <div className="korva-reference-grid teacher-grid"><Panel title="My class groups" eyebrow="ASSIGNED TO YOU" icon={School}>
      <div className="korva-role-class-list">{assignedClasses.map((item) => <button key={item.id} onClick={() => props.onNavigate("students")}><span><strong>{item.name}</strong><small>{props.data.students.filter((student) => student.classId === item.id).length} learners · your assigned group</small></span><ArrowRight size={15} /></button>)}</div>
    </Panel><QueuePanel title="Teaching work" icon={BookOpen} rows={[
      { title: "Submit today’s attendance", detail: "Mark every learner before submitting", status: "Available" },
      { title: "Enter assessment scores", detail: "Marks module planned", status: "Planned" },
      { title: "Create a class forum", detail: "Teacher-led forum tools planned", status: "Planned" },
    ]} /><QuickActions actions={[
      { title: "Take attendance", detail: "Open an assigned class register", page: "attendance", icon: ClipboardCheck },
      { title: "Find a learner", detail: "Assigned class records only", page: "students", icon: Users },
      { title: "Create class forum", detail: "Class discussion space", page: "forums", planned: true, icon: Bell },
    ]} onNavigate={props.onNavigate} /></div>
    <div className="korva-reference-lower teacher-lower"><ActivityPanel data={props.data} title="Class activity" /><BrandPanel /></div>
    <div className="korva-inline-banner"><Shield size={15} /><span>Teacher view is limited to assigned classes. Student registration and finance are not available in this workspace.</span></div>
  </>;
}

function BursarDashboard(props: Props) {
  return <>
    <Heading eyebrow="BURSAR · FINANCE OFFICE" title="Finance & fees" subtitle="Track fees, receipts, verification, and reconciliation — without academic or safeguarding records." />
    <SchoolMasthead schoolName={props.schoolName} role="bursar" focus="Fees and verified payments" />
    <KpiBand items={[
      { label: "Fees invoiced", value: formatMoney(4000), detail: "Illustrative term total", icon: FileCheck2, tone: "blue" },
      { label: "Verified received", value: formatMoney(props.verifiedFees), detail: "Sample demo figure", icon: Wallet, tone: "gold" },
      { label: "Awaiting verification", value: props.pendingVerification, detail: "Never post as paid first", icon: Clock3, tone: "blue" },
      { label: "Reconciliation", value: "2 items", detail: "Illustrative follow-up", icon: CheckCircle2, tone: "gold" },
    ]} />
    <div className="korva-reference-grid bursar-grid"><QueuePanel title="Finance follow-up" icon={Wallet} rows={[
      { title: "Verify a receipt", detail: "Payment verification workflow planned", status: "Pending" },
      { title: "Reconcile collections", detail: "Match confirmed payments to invoices", status: "Planned" },
      { title: "Review fee balances", detail: "Invoice and fee statement tools planned", status: "Planned" },
    ]} /><QuickActions actions={[
      { title: "Open finance module", detail: "Invoices and receipts", page: "finance", planned: true, icon: Wallet },
      { title: "Verify payment", detail: "Confirm receipt evidence", page: "finance", planned: true, icon: CheckCircle2 },
      { title: "Reconcile fees", detail: "Review outstanding balances", page: "finance", planned: true, icon: FileCheck2 },
    ]} onNavigate={props.onNavigate} /><BrandPanel /></div>
    <div className="korva-inline-banner"><Shield size={15} /><span>Illustrative finance totals only. No payment provider is connected, and this role is not shown academic, health, or safeguarding records.</span></div>
  </>;
}

function StudentDashboard(props: Props) {
  const student = props.data.students[0];
  const published = student?.reports.filter((item) => item.published) ?? [];
  const present = student?.attendance.filter((item) => item.mark === "P" || item.mark === "L").length ?? 0;
  return <>
    <Heading eyebrow="STUDENT · MY SCHOOL LIFE" title={`Good morning${student ? `, ${student.name.split(" ")[0]}` : ""}`} subtitle="Your personal learning space — only your own demo record is shown." />
    <section className="korva-learner-hero"><div className="korva-learner-avatar">{student?.name.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "ST"}</div><div><span>MY CLASS</span><strong>{student ? props.data.classes.find((item) => item.id === student.classId)?.name : "No sample class"}</strong><small>Saint Edward’s Secondary School · Term 3</small></div><b>STUDENT VIEW</b></section>
    <div className="korva-kpi-band learner-kpi"><article className="korva-kpi-card blue"><span className="korva-kpi-icon"><CalendarDays size={24} /></span><span className="korva-kpi-copy"><small>My attendance records</small><strong>{student?.attendance.length ?? 0}</strong><em>{present} present or late · sample data</em></span></article><article className="korva-kpi-card gold"><span className="korva-kpi-icon"><FileCheck2 size={24} /></span><span className="korva-kpi-copy"><small>Published results</small><strong>{published.length}</strong><em>Only published subjects shown</em></span></article><article className="korva-kpi-card blue"><span className="korva-kpi-icon"><BookOpen size={24} /></span><span className="korva-kpi-copy"><small>My learning resources</small><strong>Planned</strong><em>Resources are not active in this demo</em></span></article></div>
    <div className="korva-reference-grid learner-grid"><Panel title="My published results" eyebrow="YOUR RECORD ONLY" icon={GraduationCap}>{published.length ? <div className="korva-result-list">{published.map((item) => <div key={`${item.term}-${item.subject}`}><span><strong>{item.subject}</strong><small>{item.term}</small></span><b>{item.score}%</b></div>)}</div> : <p className="korva-empty-task">No published sample results yet.</p>}</Panel><QuickActions actions={[
      { title: "Open my own school record", detail: "Dated attendance and reports", page: "my_learning", icon: UserRound, onClick: props.onOpenPersonal },
      { title: "View my timetable", detail: "Personal schedule", page: "my_learning", planned: true, icon: CalendarDays },
      { title: "Open learning resources", detail: "Class materials", page: "my_learning", planned: true, icon: BookOpen },
    ]} onNavigate={props.onNavigate} /><Panel title="Your next steps" icon={Clock3}><div className="korva-role-note"><strong>Keep learning</strong><p>Your assignment list, timetable, and learning resources will appear here when those modules are built.</p><span>Student permissions: view your own learning · no attendance entry · no fee management · no access to classmates.</span></div></Panel></div>
  </>;
}

function GuardianDashboard(props: Props) {
  const student = props.data.students[0];
  const published = student?.reports.filter((item) => item.published) ?? [];
  const attendanceRate = student?.attendance.length ? Math.round((student.attendance.filter((item) => item.mark === "P" || item.mark === "L").length / student.attendance.length) * 100) : null;
  return <>
    <Heading eyebrow="PARENT / GUARDIAN · FAMILY VIEW" title="Your linked learner" subtitle="A family view of the one sample child linked to this fictional account." />
    <section className="korva-family-link-card"><div className="korva-family-link-avatar">{student?.name.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "PG"}</div><div className="korva-family-link-details"><span>DEMO VERIFIED LINK</span><strong>{student?.name ?? "No linked learner"}</strong><small>{student ? props.data.classes.find((item) => item.id === student.classId)?.name : ""} · Saint Edward’s Secondary School</small></div><span className="korva-family-link-badge"><Shield size={13} /> Sample link only</span></section>
    <div className="korva-kpi-band learner-kpi"><article className="korva-kpi-card blue"><span className="korva-kpi-icon"><CalendarDays size={24} /></span><span className="korva-kpi-copy"><small>Linked learner attendance</small><strong>{attendanceRate === null ? "No sample" : `${attendanceRate}%`}</strong><em>Based on the linked learner’s sample dates</em></span></article><article className="korva-kpi-card gold"><span className="korva-kpi-icon"><FileCheck2 size={24} /></span><span className="korva-kpi-copy"><small>Published reports</small><strong>{published.length}</strong><em>Unpublished marks remain hidden</em></span></article><article className="korva-kpi-card blue"><span className="korva-kpi-icon"><Bell size={24} /></span><span className="korva-kpi-copy"><small>School notices</small><strong>Planned</strong><em>No external messages are connected</em></span></article></div>
    <div className="korva-reference-grid family-grid"><Panel title="Linked learner’s published results" eyebrow="VERIFIED LINK ONLY" icon={GraduationCap}>{published.length ? <div className="korva-result-list">{published.map((item) => <div key={`${item.term}-${item.subject}`}><span><strong>{item.subject}</strong><small>{item.term}</small></span><b>{item.score}%</b></div>)}</div> : <p className="korva-empty-task">No published sample results yet.</p>}</Panel><QuickActions actions={[
      { title: "Open linked learner’s record", detail: "Attendance and published results", page: "my_child", icon: UserRound, onClick: props.onOpenPersonal },
      { title: "View attendance history", detail: "Linked child only", page: "my_child", icon: ClipboardCheck },
      { title: "Contact the school", detail: "Family messaging", page: "communications", planned: true, icon: Bell },
    ]} onNavigate={props.onNavigate} /><Panel title="Family access" icon={Shield}><div className="korva-role-note"><strong>One linked learner only</strong><p>This sample guardian cannot search other students, take attendance, change marks, or publish results.</p><span>Guardian identity and relationship checks are not active in this prototype.</span></div></Panel></div>
  </>;
}

function InspectorDashboard(props: Props) {
  return <>
    <Heading eyebrow="INSPECTOR · READ-ONLY OVERSIGHT" title="School oversight" subtitle="Review school-level indicators without opening student names or individual records." />
    <SchoolMasthead schoolName={props.schoolName} role="inspector" focus="Read-only, school-level indicators" />
    <KpiBand items={[
      { label: "Schools in sample scope", value: 2, detail: "Fictional tenant examples", icon: School, tone: "blue" },
      { label: "Learners in active sample", value: props.data.students.length, detail: "Aggregate only", icon: Users, tone: "gold" },
      { label: "Attendance indicator", value: props.attendanceSummary.rate === null ? "—" : `${props.attendanceSummary.rate}%`, detail: "Sample school-level total", icon: ClipboardCheck, tone: "blue" },
      { label: "Reporting status", value: "Planned", detail: "No government export active", icon: FileCheck2, tone: "gold" },
    ]} />
    <div className="korva-reference-grid inspector-grid"><PerformancePanel title="Aggregate school trend" /><QueuePanel title="Oversight indicators" icon={Shield} rows={[
      { title: "Attendance completeness", detail: "Aggregate indicator only", status: "Sample" },
      { title: "Academic reporting", detail: "No published school export in demo", status: "Planned" },
      { title: "Inspection visit notes", detail: "Restricted workflow planned", status: "Planned" },
    ]} /><QuickActions actions={[
      { title: "View school analytics", detail: "Aggregate indicators only", page: "analytics", icon: Activity },
      { title: "National reporting", detail: "Authorized exports", page: "national", planned: true, icon: FileCheck2 },
      { title: "Review reporting status", detail: "School-level overview", page: "analytics", icon: Shield },
    ]} onNavigate={props.onNavigate} /></div>
    <div className="korva-inline-banner"><Shield size={15} /><span>Inspector workspace is read-only and aggregate-only. No student names or individual records are available.</span></div>
  </>;
}

export function RoleDashboard(props: Props) {
  switch (props.role) {
    case "owner": return <OwnerDashboard {...props} />;
    case "principal": return <PrincipalDashboard {...props} />;
    case "school_admin": return <AdminDashboard {...props} />;
    case "admissions": return <AdmissionsDashboard {...props} />;
    case "teacher": return <TeacherDashboard {...props} />;
    case "bursar": return <BursarDashboard {...props} />;
    case "student": return <StudentDashboard {...props} />;
    case "guardian": return <GuardianDashboard {...props} />;
    case "inspector": return <InspectorDashboard {...props} />;
    case "platform": return null;
  }
}

export function LearnerPage({ student, onOpen }: { student: DemoStudent | null; onOpen: () => void }) {
  return <div className="korva-personal-page"><Heading eyebrow="STUDENT · PERSONAL RECORD" title="My learning" subtitle="Only your own fictional student account is available in this workspace." />{student && <div className="korva-personal-record"><span className="korva-personal-initials">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{student.name}</strong><small>{student.id} · {student.classId} · enrolled {formatDate(student.admitted)}</small></span><button className="korva-secondary-button" onClick={onOpen}>Open my record <ArrowRight size={14} /></button></div>}<div className="korva-inline-banner"><Shield size={15} /><span>Student view cannot take attendance, manage fees, open classmates’ profiles, or change published results.</span></div></div>;
}

export function FamilyPage({ student, onOpen }: { student: DemoStudent | null; onOpen: () => void }) {
  return <div className="korva-personal-page"><Heading eyebrow="PARENT / GUARDIAN · LINKED CHILD" title="My linked learner" subtitle="This sample workspace shows only the one fictional learner linked to the guardian account." />{student && <div className="korva-personal-record"><span className="korva-personal-initials">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{student.name}</strong><small>{student.id} · {student.classId} · sample verified link</small></span><button className="korva-secondary-button" onClick={onOpen}>View linked record <ArrowRight size={14} /></button></div>}<div className="korva-inline-banner"><Shield size={15} /><span>Guardian view is limited to this linked learner. It cannot search other students or take attendance.</span></div></div>;
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Sample date";
  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(value.slice(0, 10));
}
