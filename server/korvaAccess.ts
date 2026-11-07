import type { SchoolInviteRole, SchoolRole } from "../drizzle/schema";

export type SchoolCapability =
  | "overview.read"
  | "members.read"
  | "invites.manage"
  | "classes.read"
  | "classes.manage"
  | "students.read"
  | "students.manage"
  | "attendance.read"
  | "attendance.submit"
  | "attendance.correct"
  | "attendance.self.read"
  | "records.self.read"
  | "audit.read";

const roleCapabilities: Record<SchoolRole, ReadonlySet<SchoolCapability>> = {
  school_owner: new Set([
    "overview.read", "members.read", "invites.manage", "classes.read", "classes.manage",
    "students.read", "students.manage", "attendance.read", "attendance.submit",
    "attendance.correct", "audit.read",
  ]),
  principal: new Set([
    "overview.read", "members.read", "classes.read", "classes.manage", "students.read",
    "students.manage", "attendance.read", "attendance.submit", "attendance.correct", "audit.read",
  ]),
  school_admin: new Set([
    "overview.read", "members.read", "invites.manage", "classes.read", "classes.manage",
    "students.read", "students.manage", "attendance.read", "attendance.submit",
    "attendance.correct", "audit.read",
  ]),
  admissions: new Set(["overview.read", "classes.read", "students.read", "students.manage"]),
  teacher: new Set([
    "overview.read", "classes.read", "students.read", "attendance.read", "attendance.submit",
    "attendance.correct",
  ]),
  bursar: new Set(["overview.read"]),
  student: new Set(["overview.read", "attendance.self.read", "records.self.read"]),
  guardian: new Set(["overview.read", "attendance.self.read", "records.self.read"]),
  inspector: new Set(["overview.read"]),
};

export function roleHasCapability(role: SchoolRole, capability: SchoolCapability): boolean {
  return roleCapabilities[role].has(capability);
}

/** School administrators can issue only the roles listed here; only an owner can appoint principals or inspectors. */
export function canInviteRole(actorRole: SchoolRole, invitedRole: SchoolInviteRole): boolean {
  if (actorRole === "school_owner") return true;
  if (actorRole !== "school_admin") return false;
  return ["admissions", "teacher", "bursar", "student", "guardian"].includes(invitedRole);
}

export function canCreateStudents(role: SchoolRole): boolean {
  return roleHasCapability(role, "students.manage");
}

export function canManageClasses(role: SchoolRole): boolean {
  return roleHasCapability(role, "classes.manage");
}

export function canManageAttendance(role: SchoolRole): boolean {
  return role === "school_owner" || role === "principal" || role === "school_admin";
}

export function canReadAllStudents(role: SchoolRole): boolean {
  return role === "school_owner" || role === "principal" || role === "school_admin" || role === "admissions";
}

export function isSchoolStaff(role: SchoolRole): boolean {
  return role !== "student" && role !== "guardian" && role !== "inspector";
}
