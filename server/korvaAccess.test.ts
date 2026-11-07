import { describe, expect, it } from "vitest";
import {
  canCreateStudents,
  canInviteRole,
  canManageAttendance,
  canReadAllStudents,
  roleHasCapability,
} from "./korvaAccess";
import type { SchoolInviteRole, SchoolRole } from "../drizzle/schema";

const roles: SchoolRole[] = [
  "school_owner", "principal", "school_admin", "admissions", "teacher", "bursar",
  "student", "guardian", "inspector",
];

describe("KORVA school-role boundaries", () => {
  it("never gives student or guardian an attendance-taking or student-management capability", () => {
    for (const role of ["student", "guardian"] as const) {
      expect(roleHasCapability(role, "attendance.submit")).toBe(false);
      expect(roleHasCapability(role, "attendance.correct")).toBe(false);
      expect(canCreateStudents(role)).toBe(false);
      expect(canManageAttendance(role)).toBe(false);
    }
  });

  it("limits teachers to assigned-class student and attendance capabilities", () => {
    expect(roleHasCapability("teacher", "students.read")).toBe(true);
    expect(roleHasCapability("teacher", "attendance.submit")).toBe(true);
    expect(roleHasCapability("teacher", "students.manage")).toBe(false);
    expect(roleHasCapability("teacher", "classes.manage")).toBe(false);
    expect(roleHasCapability("teacher", "members.read")).toBe(false);
  });

  it("does not grant student records or attendance to bursars or inspectors", () => {
    for (const role of ["bursar", "inspector"] as const) {
      expect(roleHasCapability(role, "students.read")).toBe(false);
      expect(roleHasCapability(role, "attendance.read")).toBe(false);
      expect(roleHasCapability(role, "records.self.read")).toBe(false);
    }
  });

  it("allows only authorized roles to read all school students", () => {
    const allowed = new Set<SchoolRole>(["school_owner", "principal", "school_admin", "admissions"]);
    for (const role of roles) expect(canReadAllStudents(role)).toBe(allowed.has(role));
  });

  it("keeps school invitations from granting owner or platform-admin access", () => {
    const rolesThatMayInvite: SchoolRole[] = ["school_owner", "school_admin"];
    for (const role of roles) {
      for (const invited of ["principal", "school_admin", "admissions", "teacher", "bursar", "student", "guardian", "inspector"] as SchoolInviteRole[]) {
        if (!rolesThatMayInvite.includes(role)) expect(canInviteRole(role, invited)).toBe(false);
      }
    }
    expect(canInviteRole("school_admin", "principal")).toBe(false);
    expect(canInviteRole("school_admin", "inspector")).toBe(false);
  });
});
