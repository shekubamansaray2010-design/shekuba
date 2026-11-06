export type DemoRole = "owner" | "principal" | "school_admin" | "admissions" | "teacher" | "bursar" | "student" | "guardian" | "inspector" | "platform";
export type AttendanceMark = "P" | "A" | "L" | "E";

export type DemoClass = { id: string; name: string; teacherIds: string[] };
export type TimelineEvent = {
  id: string;
  kind: string;
  title: string;
  eventDate: string;
  recordedAt: string;
  detail: string;
};
export type DemoStudent = {
  id: string;
  name: string;
  classId: string;
  guardian: string;
  status: string;
  admitted: string;
  attendance: { date: string; mark: AttendanceMark }[];
  reports: { term: string; subject: string; score: number; published: boolean }[];
  events: TimelineEvent[];
};
export type AttendanceRegister = {
  id: string;
  date: string;
  classId: string;
  records: Record<string, AttendanceMark>;
  status: "Submitted" | "Saved offline";
  correctionReason?: string;
  submittedAt: string;
};
export type DemoSchoolData = {
  classes: DemoClass[];
  students: DemoStudent[];
  attendance: AttendanceRegister[];
  activity: { id: string; at: string; message: string; actor: string }[];
};
export type DemoState = { version: 1; schools: Record<string, DemoSchoolData> };

export const SCHOOLS = [
  { id: "s1", name: "Saint Edward’s Secondary School", status: "Active" },
  { id: "s2", name: "Demo School B", status: "Setup" },
] as const;

export const ROLE_META: Record<DemoRole, { label: string; initials: string }> = {
  owner: { label: "School owner", initials: "SO" },
  principal: { label: "Principal", initials: "PR" },
  school_admin: { label: "School administrator", initials: "SA" },
  admissions: { label: "Admissions officer", initials: "AO" },
  teacher: { label: "Teacher", initials: "TN" },
  bursar: { label: "Bursar", initials: "BU" },
  student: { label: "Student", initials: "ST" },
  guardian: { label: "Parent / guardian", initials: "PG" },
  inspector: { label: "School inspector", initials: "IN" },
  platform: { label: "KORVA platform admin", initials: "KA" },
};

export const NAV_ITEMS = [
  { id: "dashboard", label: "My dashboard", group: "Workspace", roles: ["owner", "principal", "school_admin", "admissions", "teacher", "bursar", "student", "guardian", "inspector"] },
  { id: "students", label: "Student records", group: "School records", roles: ["principal", "school_admin", "admissions", "teacher"] },
  { id: "attendance", label: "Attendance", group: "School records", roles: ["principal", "teacher"] },
  { id: "classes", label: "Classes & streams", group: "School records", roles: ["owner", "principal", "school_admin", "teacher"], phase: 2 },
  { id: "applicants", label: "Admissions pipeline", group: "School records", roles: ["admissions"], phase: 2 },
  { id: "staff", label: "Staff & coverage", group: "School operations", roles: ["owner", "principal", "school_admin"], phase: 2 },
  { id: "assessments", label: "Examinations & scores", group: "Teaching & learning", roles: ["principal", "teacher"], phase: 4 },
  { id: "results", label: "Results & reports", group: "Teaching & learning", roles: ["principal", "teacher"], phase: 4 },
  { id: "learning", label: "Learning resources", group: "Teaching & learning", roles: ["teacher"], phase: 6 },
  { id: "forums", label: "Class forums", group: "Teaching & learning", roles: ["teacher"], phase: 6 },
  { id: "my_learning", label: "My learning", group: "My school life", roles: ["student"], phase: 6 },
  { id: "my_child", label: "My linked learner", group: "Family", roles: ["guardian"], phase: 4 },
  { id: "finance", label: "Finance & fees", group: "Finance office", roles: ["bursar"], phase: 5 },
  { id: "communications", label: "Communication", group: "School community", roles: ["owner", "principal", "school_admin", "teacher", "student", "guardian"], phase: 3 },
  { id: "library", label: "Library & inventory", group: "School operations", roles: ["school_admin", "teacher", "student"], phase: 6 },
  { id: "transport", label: "Transport", group: "School operations", roles: ["school_admin", "guardian"], phase: 6 },
  { id: "analytics", label: "School analytics", group: "Insights", roles: ["owner", "principal", "inspector"], phase: 7 },
  { id: "leaderboards", label: "Leaderboards", group: "Insights", roles: ["owner", "principal"], phase: 7 },
  { id: "national", label: "National reporting", group: "Oversight", roles: ["principal", "inspector"], phase: 8 },
  { id: "sync", label: "Offline changes", group: "Administration", roles: ["owner", "principal", "school_admin", "admissions", "teacher", "bursar"], phase: 3 },
  { id: "settings", label: "School settings", group: "Administration", roles: ["owner", "school_admin"], phase: 2 },
] as const;

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatMoney(amount: number) {
  return `Le ${new Intl.NumberFormat("en-SL", { maximumFractionDigits: 0 }).format(amount)}`;
}

function makeStudent(
  index: number,
  firstNames: string[],
  surnames: string[],
  classes: DemoClass[],
  today: string,
): DemoStudent {
  const classInfo = classes[index % classes.length];
  const name = `${firstNames[index % firstNames.length]} ${surnames[(index * 3 + 1) % surnames.length]}`;
  const admitted = `202${5 - (index % 2)}-09-${String(2 + (index % 24)).padStart(2, "0")}`;
  const attendance = [
    { date: "2026-10-28", mark: "P" as const },
    { date: "2026-10-29", mark: index % 8 === 0 ? ("L" as const) : ("P" as const) },
    { date: "2026-10-30", mark: index % 11 === 0 ? ("A" as const) : ("P" as const) },
    { date: today, mark: "P" as const },
  ];
  return {
    id: `SES-2026-${String(index + 1).padStart(3, "0")}`,
    name,
    classId: classInfo.id,
    guardian: `Guardian ${index + 1}`,
    status: "Active",
    admitted,
    attendance,
    reports: [
      { term: "Term 2 · 2026", subject: "Mathematics", score: 78 - (index % 19), published: true },
      { term: "Term 2 · 2026", subject: "English Language", score: 72 - (index % 17), published: true },
      { term: "Term 3 · 2026", subject: "Integrated Science", score: 81 - (index % 21), published: false },
    ],
    events: [
      {
        id: `event-${index}-enrolment`,
        kind: "Enrollment",
        title: "Enrolled at Saint Edward’s",
        eventDate: admitted,
        recordedAt: `${admitted}T09:15:00.000Z`,
        detail: `Assigned to ${classInfo.name}; guardian relationship verified in this demo.`,
      },
      {
        id: `event-${index}-report`,
        kind: "Academic report",
        title: "Term 2 report published",
        eventDate: "2026-08-14",
        recordedAt: "2026-08-14T13:10:00.000Z",
        detail: "Two published subject results are available in this sample record.",
      },
      {
        id: `event-${index}-attendance`,
        kind: "Attendance",
        title: "Attendance recorded",
        eventDate: today,
        recordedAt: `${today}T08:05:00.000Z`,
        detail: "Present for the morning register.",
      },
    ],
  };
}

export function createSeedState(): DemoState {
  const firstNames = ["Aminata", "Mohamed", "Fatmata", "Ibrahim", "Isatu", "Abu", "Mariama", "Sorie", "Hawa", "Alusine", "Kadiatu", "Foday", "Zainab", "Musa"];
  const surnames = ["Kamara", "Conteh", "Sesay", "Bangura", "Koroma", "Turay", "Jalloh", "Mansaray"];
  const classes: DemoClass[] = [
    { id: "c1", name: "JSS 3 A", teacherIds: ["teacher-1"] },
    { id: "c2", name: "SSS 1 Arts", teacherIds: ["teacher-1"] },
    { id: "c3", name: "SSS 2 Science", teacherIds: ["teacher-2"] },
    { id: "c4", name: "SSS 3 Science", teacherIds: ["teacher-2"] },
  ];
  const today = dateKey();
  const students = Array.from({ length: 28 }, (_, index) => makeStudent(index, firstNames, surnames, classes, today));
  return {
    version: 1,
    schools: {
      s1: {
        classes,
        students,
        attendance: [],
        activity: [
          { id: "seed", at: new Date().toISOString(), message: "Fictional demonstration school data loaded", actor: "KORVA demo" },
          { id: "activity-report", at: "2026-08-14T13:10:00.000Z", message: "Term 2 report cards published", actor: "School leader · demo" },
          { id: "activity-admission", at: "2026-06-09T10:30:00.000Z", message: "New student enrollment completed", actor: "Admissions · demo" },
        ],
      },
      s2: { classes: [], students: [], attendance: [], activity: [] },
    },
  };
}

const STORAGE_KEY = "korva-browser-demo-v1";
export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === 1 && parsed.schools?.s1 && parsed.schools?.s2) {
        for (const school of Object.values(parsed.schools)) {
          for (const register of school.attendance ?? []) {
            if ((register.status as string) === "Pending local sync") register.status = "Saved offline";
          }
        }
        return parsed;
      }
    }
  } catch {
    // Storage may be disabled or contain a partial/corrupt demo. Fall back to fictional seed values.
  }
  return createSeedState();
}

export function saveDemoState(state: DemoState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
