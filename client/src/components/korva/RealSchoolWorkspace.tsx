import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, BookOpen, CalendarCheck2, ChevronDown, CircleAlert,
  ClipboardList, GraduationCap, LayoutDashboard, LogOut, School, ShieldCheck,
  UserRound, UsersRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import RealAttendancePanel from "./RealAttendancePanel";
import RealClassesPanel from "./RealClassesPanel";
import RealPeoplePanel from "./RealPeoplePanel";
import RealStudentsPanel from "./RealStudentsPanel";
import type { SchoolRole } from "./real-school-types";
export type { SchoolRole } from "./real-school-types";

type Section = "overview" | "classes" | "students" | "attendance" | "people" | "audit";

type Props = {
  userName: string | null;
  userEmail: string | null;
  isPlatformAdmin: boolean;
  pendingInviteToken: string | null;
  onInviteResolved: () => void;
  onSignOut: () => Promise<void>;
  signOutBusy: boolean;
  signOutError: string;
};

const ROLE_LABELS: Record<SchoolRole, string> = {
  school_owner: "School owner", principal: "Principal", school_admin: "School administrator",
  admissions: "Admissions officer", teacher: "Teacher", bursar: "Bursar",
  student: "Student", guardian: "Parent / guardian", inspector: "School inspector",
};

const ROLE_INTRO: Record<SchoolRole, { eyebrow: string; title: string; description: string; task: string }> = {
  school_owner: { eyebrow: "SCHOOL LEADERSHIP", title: "Your school at a glance", description: "Manage the school workspace, people, classes, and the records your team depends on.", task: "Review school operations and keep role access aligned with each person’s responsibilities." },
  principal: { eyebrow: "ACADEMIC LEADERSHIP", title: "Lead the school day", description: "See school-level enrollment and attendance activity, then move into the classes and records you oversee.", task: "Use dated school records to coordinate day-to-day academic operations." },
  school_admin: { eyebrow: "SCHOOL OPERATIONS", title: "Keep daily operations moving", description: "Manage active class groups, student records, role invitations, and attendance workflows.", task: "Start with the operational work that needs attention in this school." },
  admissions: { eyebrow: "ADMISSIONS & ENROLLMENT", title: "Build accurate student records", description: "Enroll learners into the right class and preserve the dates behind each placement change.", task: "Use the student directory to create or review school-scoped enrollment records." },
  teacher: { eyebrow: "YOUR ASSIGNED CLASSES", title: "Your classroom workspace", description: "Work only with classes assigned to your teacher membership and the learners in those classes.", task: "Take attendance for an assigned class or open a permitted learner record." },
  bursar: { eyebrow: "FINANCE ROLE", title: "Finance workspace", description: "Your school membership is recognized, but finance records and payment processing are not enabled in this Phase 2 foundation.", task: "No student academic, attendance, or safeguarding records are shown to the bursar role." },
  student: { eyebrow: "LEARNER PORTAL", title: "Your student record", description: "Open only the learner record linked to your signed-in school membership.", task: "Review your dated enrollment history and available attendance entries." },
  guardian: { eyebrow: "FAMILY PORTAL", title: "Your linked learner records", description: "Open only learner records explicitly linked to your signed-in guardian membership.", task: "Review the enrollment timeline and permitted attendance information for linked children." },
  inspector: { eyebrow: "READ-ONLY OVERSIGHT", title: "School-level oversight", description: "Review high-level counts for this school without opening named student profiles or changing records.", task: "Use aggregate information only; the learner directory and individual records are not available to this role." },
};

const staffManagementRoles: SchoolRole[] = ["school_owner", "principal", "school_admin"];
const attendanceRoles: SchoolRole[] = ["school_owner", "principal", "school_admin", "teacher"];
const studentRecordRoles: SchoolRole[] = ["school_owner", "principal", "school_admin", "admissions", "teacher", "student", "guardian"];
const navIcon = { overview: LayoutDashboard, classes: BookOpen, students: UserRound, attendance: CalendarCheck2, people: UsersRound, audit: ClipboardList };

function navigationFor(role: SchoolRole): { id: Section; label: string }[] {
  if (role === "student") return [{ id: "students", label: "My record" }];
  if (role === "guardian") return [{ id: "students", label: "Linked learners" }];
  if (role === "inspector") return [{ id: "overview", label: "School overview" }];
  if (role === "bursar") return [{ id: "overview", label: "Finance workspace" }];
  const items: { id: Section; label: string }[] = [{ id: "overview", label: "Dashboard" }];
  if (["school_owner", "principal", "school_admin", "admissions", "teacher"].includes(role)) items.push({ id: "classes", label: role === "teacher" ? "My classes" : "Classes" });
  if (studentRecordRoles.includes(role)) items.push({ id: "students", label: role === "teacher" ? "My students" : "Students" });
  if (attendanceRoles.includes(role)) items.push({ id: "attendance", label: "Attendance" });
  if (staffManagementRoles.includes(role)) items.push({ id: "people", label: "People & roles" });
  if (["school_owner", "principal", "school_admin"].includes(role)) items.push({ id: "audit", label: "Activity history" });
  return items;
}

function roleName(role: SchoolRole) { return ROLE_LABELS[role]; }

export default function RealSchoolWorkspace({ userName, userEmail, isPlatformAdmin, pendingInviteToken, onInviteResolved, onSignOut, signOutBusy, signOutError }: Props) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [schoolName, setSchoolName] = useState("");
  const [notice, setNotice] = useState("");
  const inviteAttempted = useRef<string | null>(null);
  const utils = trpc.useUtils();
  const memberships = trpc.korva.school.myMemberships.useQuery(undefined, { retry: false });
  const membershipRows = memberships.data ?? [];
  const activeMembership = membershipRows.find((item) => item.schoolId === selectedSchoolId);
  const role = activeMembership?.role as SchoolRole | undefined;
  const navItems = role ? navigationFor(role) : [];
  const overview = trpc.korva.school.overview.useQuery(
    { schoolId: activeMembership?.schoolId ?? 1 },
    { enabled: Boolean(activeMembership) },
  );
  const platformSummary = trpc.korva.platform.aggregate.useQuery(undefined, { enabled: isPlatformAdmin });

  useEffect(() => {
    if (!memberships.data) return;
    if (memberships.data.length === 0 || (selectedSchoolId !== null && !memberships.data.some((item) => item.schoolId === selectedSchoolId))) setSelectedSchoolId(null);
  }, [memberships.data, selectedSchoolId]);

  useEffect(() => {
    setActiveSection(navItems[0]?.id ?? "overview");
  }, [activeMembership?.membershipId]);

  const createSchool = trpc.korva.school.create.useMutation({
    onSuccess: async (result) => {
      setSelectedSchoolId(result.schoolId);
      setSchoolName("");
      setNotice(`School workspace created. Your membership is ${roleName("school_owner")}.`);
      await utils.korva.school.myMemberships.invalidate();
    },
  });
  const acceptInvite = trpc.korva.school.acceptInvitation.useMutation({
    onSuccess: async (result) => {
      setSelectedSchoolId(result.schoolId);
      setNotice(`Invitation accepted as ${roleName(result.role)}. School permissions are now active.`);
      onInviteResolved();
      await utils.korva.school.myMemberships.invalidate();
    },
  });

  useEffect(() => {
    if (!pendingInviteToken || inviteAttempted.current === pendingInviteToken || acceptInvite.isPending) return;
    inviteAttempted.current = pendingInviteToken;
    acceptInvite.mutate({ token: pendingInviteToken });
  }, [pendingInviteToken, acceptInvite.isPending]);

  async function createSchoolSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    createSchool.mutate({ name: schoolName.trim() });
  }

  const activeIntro = role ? ROLE_INTRO[role] : null;
  const activeNav = navItems.find((item) => item.id === activeSection);

  return <main className="korva-live-app">
    <aside className="korva-live-sidebar">
      <a className="korva-live-brand" href="/" aria-label="KORVA home"><span className="korva-live-brand-mark"><GraduationCap size={22} /></span><strong>KORVA</strong><small>RISE. LEARN. LEAD.</small></a>
      <div className="korva-live-side-caption">SCHOOL WORKSPACE</div>
      {activeMembership && role && <div className="korva-live-side-school"><School size={16} /><span>{activeMembership.schoolName}</span><small>{roleName(role)}</small></div>}
      {role && <nav className="korva-live-nav" aria-label={`${roleName(role)} workspace`}>
        {navItems.map((item) => { const Icon = navIcon[item.id]; return <button type="button" key={item.id} className={activeSection === item.id ? "active" : ""} onClick={() => setActiveSection(item.id)} aria-current={activeSection === item.id ? "page" : undefined}><Icon size={17} /><span>{item.label}</span><ArrowRight className="korva-live-nav-arrow" size={14} /></button>; })}
      </nav>}
      {isPlatformAdmin && <div className="korva-live-platform-tag"><ShieldCheck size={15} /> Platform admin</div>}
      <div className="korva-live-sidebar-bottom"><div className="korva-live-user-mini"><span>{(userName || userEmail || "M").slice(0, 1).toUpperCase()}</span><div><strong>{userName || "Signed-in member"}</strong><small>{userEmail || "Manus account"}</small></div></div><button type="button" onClick={() => void onSignOut()} disabled={signOutBusy} className="korva-live-signout"><LogOut size={15} />{signOutBusy ? "Signing out…" : "Sign out"}</button></div>
    </aside>

    <section className="korva-live-main">
      <header className="korva-live-topbar"><div><span className="korva-live-eyebrow">RISE. LEARN. LEAD.</span><h1>{activeMembership?.schoolName || "Your school workspace"}</h1></div><div className="korva-live-top-actions">
        {membershipRows.length > 0 && activeMembership && <label className="korva-live-school-select"><span>Active school</span><select aria-label="Choose active school" value={selectedSchoolId ?? ""} onChange={(event) => { setSelectedSchoolId(event.target.value ? Number(event.target.value) : null); setNotice(""); }}><option value="">Choose school</option>{membershipRows.map((item) => <option key={item.schoolId} value={item.schoolId}>{item.schoolName} · {roleName(item.role as SchoolRole)}</option>)}</select><ChevronDown size={14} /></label>}
        <span className="korva-live-auth-badge"><span /> Signed in</span>
      </div></header>

      {pendingInviteToken && <div className="korva-live-notice" role="status"><ShieldCheck size={16} />Accepting your secure school invitation…</div>}
      {acceptInvite.error && <div className="korva-live-error" role="alert"><CircleAlert size={16} />{acceptInvite.error.message}<button type="button" className="korva-live-text-button" onClick={() => { if (pendingInviteToken) { inviteAttempted.current = pendingInviteToken; acceptInvite.mutate({ token: pendingInviteToken }); } }}>Try again</button></div>}
      {notice && <div className="korva-live-success" role="status">{notice}</div>}
      {signOutError && <div className="korva-live-error" role="alert">{signOutError}</div>}

      {memberships.isLoading ? <div className="korva-live-loading"><span className="korva-spinner" />Loading your school memberships…</div>
        : memberships.error ? <div className="korva-live-error" role="alert">{memberships.error.message}</div>
        : isPlatformAdmin && membershipRows.length === 0 ? <PlatformOverview loading={platformSummary.isLoading} error={platformSummary.error?.message} data={platformSummary.data} />
        : membershipRows.length === 0 ? <section className="korva-live-onboarding"><div className="korva-live-onboarding-mark"><School size={30} /></div><span className="korva-live-eyebrow">START A SCHOOL WORKSPACE</span><h2>Create your school</h2><p>A signed-in account starts with no school privileges. Creating a school makes you its first owner; other roles are added only through single-use invitations.</p><form className="korva-live-form" onSubmit={createSchoolSubmit}><label>School name<input required minLength={2} maxLength={160} value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="Enter your official school name" /></label><button className="korva-live-button primary" type="submit" disabled={createSchool.isPending}>{createSchool.isPending ? "Creating workspace…" : "Create school workspace"}</button></form>{createSchool.error && <p className="korva-live-error" role="alert">{createSchool.error.message}</p>}<p className="korva-live-footnote">Received an invitation? Open its private link in this browser while signed in. KORVA never grants a school role merely because an account is authenticated.</p></section>
        : !activeMembership || !role ? <section className="korva-live-selection"><span className="korva-live-eyebrow">MEMBERSHIP REQUIRED</span><h2>Choose your active school</h2><p>You have one or more school memberships. Select the school and role to use now; permissions and records are isolated by school.</p><select value={selectedSchoolId ?? ""} onChange={(event) => setSelectedSchoolId(event.target.value ? Number(event.target.value) : null)}><option value="">Select a school and role</option>{membershipRows.map((item) => <option key={item.schoolId} value={item.schoolId}>{item.schoolName} · {roleName(item.role as SchoolRole)}</option>)}</select></section>
        : <>
          <div className="korva-live-context-strip"><div className="korva-live-context-icon"><ShieldCheck size={17} /></div><div><strong>{roleName(role)} workspace</strong><span>Access is scoped to this school and enforced by the server.</span></div><span className="korva-live-context-school">{activeMembership.schoolName}</span></div>
          <div className="korva-live-workarea">
            <div className="korva-live-page-heading"><div><span className="korva-live-eyebrow">{activeIntro?.eyebrow}</span><h2>{activeSection === "overview" ? activeIntro?.title : activeNav?.label}</h2><p>{activeSection === "overview" ? activeIntro?.description : sectionDescription(activeSection, role)}</p></div><span className="korva-live-role-chip">{roleName(role)}</span></div>
            {activeSection === "overview" && <OverviewPanel role={role} data={overview.data} loading={overview.isLoading} error={overview.error?.message} onGo={setActiveSection} />}
            {activeSection === "classes" && <RealClassesPanel key={activeMembership.membershipId} schoolId={activeMembership.schoolId} role={role} />}
            {activeSection === "students" && <RealStudentsPanel key={activeMembership.membershipId} schoolId={activeMembership.schoolId} role={role} />}
            {activeSection === "attendance" && <RealAttendancePanel key={activeMembership.membershipId} schoolId={activeMembership.schoolId} role={role} />}
            {activeSection === "people" && <RealPeoplePanel key={activeMembership.membershipId} schoolId={activeMembership.schoolId} role={role} />}
            {activeSection === "audit" && <AuditPanel key={activeMembership.membershipId} schoolId={activeMembership.schoolId} />}
          </div>
        </>}
      <footer className="korva-live-footer"><span><ShieldCheck size={14} /> Secure school membership</span><span>Separate from fictional demo data</span></footer>
    </section>
  </main>;
}

function sectionDescription(section: Section, role: SchoolRole) {
  if (section === "classes") return role === "teacher" ? "Your assigned class groups only." : "Manage school class groups and authorized teacher assignments.";
  if (section === "students") return role === "student" || role === "guardian" ? "Only the learner records linked to your active membership." : role === "teacher" ? "Learners in your assigned classes." : "Search and manage dated student enrollment records.";
  if (section === "attendance") return role === "teacher" ? "Submit complete attendance registers for assigned classes." : "Review and correct school attendance with an audited reason.";
  if (section === "people") return "Review active school memberships and issue only the roles your membership is permitted to grant.";
  if (section === "audit") return "Recent sensitive school actions, actor, date, and correction reason.";
  return "Use the workspace for tasks your school role is allowed to perform.";
}

function OverviewPanel({ role, data, loading, error, onGo }: { role: SchoolRole; data?: { school: { id: number; name: string }; role: SchoolRole; activeClasses: number | null; activeStudents: number | null; attendanceRegistersToday: number | null }; loading: boolean; error?: string; onGo: (section: Section) => void }) {
  const intro = ROLE_INTRO[role];
  const actions: Partial<Record<SchoolRole, { label: string; section: Section; icon: typeof BookOpen }[]>> = {
    school_owner: [{ label: "Manage people & access", section: "people", icon: UsersRound }, { label: "Review classes", section: "classes", icon: BookOpen }, { label: "Open attendance", section: "attendance", icon: CalendarCheck2 }],
    principal: [{ label: "Review student records", section: "students", icon: UserRound }, { label: "Open attendance", section: "attendance", icon: CalendarCheck2 }],
    school_admin: [{ label: "Manage classes", section: "classes", icon: BookOpen }, { label: "People & access", section: "people", icon: UsersRound }, { label: "Attendance", section: "attendance", icon: CalendarCheck2 }],
    admissions: [{ label: "Enroll or find a student", section: "students", icon: UserRound }, { label: "Review classes", section: "classes", icon: BookOpen }],
    teacher: [{ label: "Take attendance", section: "attendance", icon: CalendarCheck2 }, { label: "My students", section: "students", icon: UserRound }, { label: "My classes", section: "classes", icon: BookOpen }],
    student: [{ label: "Open my record", section: "students", icon: UserRound }],
    guardian: [{ label: "Open linked learners", section: "students", icon: UserRound }],
    inspector: [], bursar: [],
  };
  const metrics = role === "teacher" ? [
    ["Assigned classes", data?.activeClasses], ["Learners in your classes", data?.activeStudents], ["Registers today", data?.attendanceRegistersToday],
  ] : role === "inspector" ? [
    ["School class groups", data?.activeClasses], ["Active learner count", data?.activeStudents], ["Registers submitted today", data?.attendanceRegistersToday],
  ] : role === "admissions" ? [
    ["Active enrollments", data?.activeStudents], ["Active class groups", data?.activeClasses],
  ] : role === "bursar" || role === "student" || role === "guardian" ? [] : [
    ["Active students", data?.activeStudents], ["Active classes", data?.activeClasses], ["Attendance registers today", data?.attendanceRegistersToday],
  ];
  const roleActions = actions[role] ?? [];
  return <div className="korva-live-overview">
    {loading && <p className="korva-live-muted">Loading school overview…</p>}
    {error && <p className="korva-live-error" role="alert">{error}</p>}
    <div className="korva-live-task-card"><div className="korva-live-task-icon"><Activity size={21} /></div><div><span className="korva-live-eyebrow">YOUR ROLE’S FOCUS</span><p>{intro.task}</p></div></div>
    {metrics.length > 0 && <div className="korva-live-metrics">{metrics.map(([label, value], index) => <article key={label as string} className={`korva-live-metric metric-${index}`}><span>{label}</span><strong>{value === null || value === undefined ? loading ? "…" : "—" : Number(value).toLocaleString()}</strong><small>Verified school records</small></article>)}</div>}
    {role === "bursar" && <div className="korva-live-module-notice"><CircleAlert size={18} /><div><strong>Finance features are not active yet</strong><p>Fees, invoices, payment entry, and reconciliation are not connected in this phase. No student academic or attendance records are available from the bursar workspace.</p></div></div>}
    {role === "inspector" && <div className="korva-live-module-notice"><ShieldCheck size={18} /><div><strong>Read-only school totals</strong><p>This view contains aggregate counts only. It does not provide named student records, attendance rows, edits, or role-management actions.</p></div></div>}
    {(role === "student" || role === "guardian") && <div className="korva-live-module-notice"><GraduationCap size={18} /><div><strong>Personal school record</strong><p>Open your record to see its dated enrollment history and the attendance information linked to this membership.</p></div></div>}
    {roleActions.length > 0 && <section className="korva-live-quick-actions"><h3>Next actions for {roleName(role).toLowerCase()}</h3><div>{roleActions.map((action) => { const Icon = action.icon; return <button type="button" key={action.label} onClick={() => onGo(action.section)}><span><Icon size={19} /></span><strong>{action.label}</strong><ArrowRight size={15} /></button>; })}</div></section>}
    <div className="korva-live-integrity-note"><ShieldCheck size={16} /><span>Only server-confirmed school memberships and permissions open these records. Demo changes never enter this workspace.</span></div>
  </div>;
}

function PlatformOverview({ loading, error, data }: { loading: boolean; error?: string; data?: { schoolCount: number; activeMemberships: number; activeStudentRecords: number } }) {
  return <div className="korva-live-workarea"><div className="korva-live-page-heading"><div><span className="korva-live-eyebrow">PLATFORM ADMINISTRATION</span><h2>Tenant operations overview</h2><p>Cross-school aggregate totals only. Student names, individual profiles, attendance rows, and school financial records are not exposed here.</p></div><span className="korva-live-role-chip">Platform admin</span></div>{error && <p className="korva-live-error" role="alert">{error}</p>}{loading ? <p className="korva-live-muted">Loading aggregate totals…</p> : data && <div className="korva-live-metrics"><article className="korva-live-metric metric-0"><span>Schools</span><strong>{data.schoolCount.toLocaleString()}</strong><small>All tenant records</small></article><article className="korva-live-metric metric-1"><span>Active memberships</span><strong>{data.activeMemberships.toLocaleString()}</strong><small>All school roles</small></article><article className="korva-live-metric metric-2"><span>Active student records</span><strong>{data.activeStudentRecords.toLocaleString()}</strong><small>Aggregate only</small></article></div>}</div>;
}

function AuditPanel({ schoolId }: { schoolId: number }) {
  const audit = trpc.korva.audit.recent.useQuery({ schoolId, limit: 50 });
  return <section className="korva-live-panel"><div className="korva-live-panel-head"><div><span className="korva-live-eyebrow">ACCOUNTABILITY</span><h2><ClipboardList size={20} /> School activity history</h2><p>Recent school actions and attendance corrections. Audit rows are append-only through the application API.</p></div></div>{audit.isLoading && <p className="korva-live-muted">Loading activity…</p>}{audit.error && <p className="korva-live-error" role="alert">{audit.error.message}</p>}{audit.data?.length === 0 && <div className="korva-live-empty">No activity has been recorded yet.</div>}{!!audit.data?.length && <div className="korva-live-audit-list">{audit.data.map((event) => <article key={event.id}><span className="korva-live-audit-dot" /><div><strong>{event.eventType.replaceAll(".", " · ").replaceAll("_", " ")}</strong><small>{event.entityType} #{event.entityId} · {new Date(event.createdAt).toLocaleString()}</small>{event.reason && <p>Reason: {event.reason}</p>}</div></article>)}</div>}</section>;
}
