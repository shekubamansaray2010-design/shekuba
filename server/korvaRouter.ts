import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  attendanceMarkValues,
  attendanceRecords,
  attendanceSessions,
  classTeacherAssignments,
  membershipStudentLinks,
  schoolAuditEvents,
  schoolClasses,
  schoolInviteRoleValues,
  schoolInvitations,
  schoolMemberships,
  schoolRoleValues,
  schools,
  studentHistory,
  students,
  users,
  type SchoolInviteRole,
  type SchoolRole,
} from "../drizzle/schema";
import { getDb } from "./db";
import { canCreateStudents, canInviteRole, canManageAttendance, canManageClasses, canReadAllStudents, roleHasCapability } from "./korvaAccess";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

const positiveId = z.number().int().positive().max(2_147_483_647);
const schoolInput = z.object({ schoolId: positiveId });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid date");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function tokenDigest(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function throwDatabaseUnavailable(): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "School records are temporarily unavailable." });
}

async function requireDb() {
  const db = await getDb();
  if (!db) throwDatabaseUnavailable();
  return db;
}

async function getMembership(userId: number, schoolId: number) {
  const db = await requireDb();
  const [membership] = await db.select().from(schoolMemberships).where(and(
    eq(schoolMemberships.userId, userId),
    eq(schoolMemberships.schoolId, schoolId),
    eq(schoolMemberships.status, "active"),
  )).limit(1);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have an active membership in this school." });
  return { db, membership };
}

function requireCapability(role: SchoolRole, capability: Parameters<typeof roleHasCapability>[1]) {
  if (!roleHasCapability(role, capability)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your school role does not permit this action." });
  }
}

async function requireClassAttendanceAccess(
  db: Awaited<ReturnType<typeof requireDb>>,
  membership: typeof schoolMemberships.$inferSelect,
  classId: number,
) {
  if (!roleHasCapability(membership.role, "attendance.read")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your school role cannot access attendance." });
  }
  const [schoolClass] = await db.select().from(schoolClasses).where(and(
    eq(schoolClasses.id, classId),
    eq(schoolClasses.schoolId, membership.schoolId),
    eq(schoolClasses.status, "active"),
  )).limit(1);
  if (!schoolClass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  if (membership.role === "teacher") {
    const [assignment] = await db.select({ id: classTeacherAssignments.id }).from(classTeacherAssignments).where(and(
      eq(classTeacherAssignments.schoolId, membership.schoolId),
      eq(classTeacherAssignments.classId, classId),
      eq(classTeacherAssignments.membershipId, membership.id),
    )).limit(1);
    if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  } else if (!canManageAttendance(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This role may not manage school attendance." });
  }
  return schoolClass;
}

async function getAccessibleStudent(
  db: Awaited<ReturnType<typeof requireDb>>,
  membership: typeof schoolMemberships.$inferSelect,
  studentId: number,
) {
  if (!roleHasCapability(membership.role, "students.read") && !roleHasCapability(membership.role, "records.self.read")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your school role cannot access student records." });
  }
  const [student] = await db.select({
    id: students.id,
    schoolId: students.schoolId,
    classId: students.classId,
    studentNumber: students.studentNumber,
    fullName: students.fullName,
    status: students.status,
    admittedAt: students.admittedAt,
    createdAt: students.createdAt,
    updatedAt: students.updatedAt,
    className: schoolClasses.name,
    academicYear: schoolClasses.academicYear,
  }).from(students).innerJoin(schoolClasses, eq(students.classId, schoolClasses.id)).where(and(
    eq(students.id, studentId),
    eq(students.schoolId, membership.schoolId),
    eq(schoolClasses.schoolId, membership.schoolId),
  )).limit(1);
  if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });

  if (canReadAllStudents(membership.role)) return student;
  if (membership.role === "teacher") {
    const [assignment] = await db.select({ id: classTeacherAssignments.id }).from(classTeacherAssignments).where(and(
      eq(classTeacherAssignments.schoolId, membership.schoolId),
      eq(classTeacherAssignments.classId, student.classId),
      eq(classTeacherAssignments.membershipId, membership.id),
    )).limit(1);
    if (assignment) return student;
  } else if (membership.role === "student" || membership.role === "guardian") {
    const [link] = await db.select({ id: membershipStudentLinks.id }).from(membershipStudentLinks).where(and(
      eq(membershipStudentLinks.schoolId, membership.schoolId),
      eq(membershipStudentLinks.membershipId, membership.id),
      eq(membershipStudentLinks.studentId, student.id),
      eq(membershipStudentLinks.linkType, membership.role === "student" ? "self" : "guardian"),
    )).limit(1);
    if (link) return student;
  }
  // Use NOT_FOUND rather than disclose whether an inaccessible student exists.
  throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

const invitePreviewProcedure = publicProcedure.input(z.object({
  token: z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/),
})).mutation(async ({ input }) => {
  const db = await requireDb();
  const now = new Date();
  const [invite] = await db.select({
    role: schoolInvitations.role,
    studentId: schoolInvitations.studentId,
    expiresAt: schoolInvitations.expiresAt,
    schoolName: schools.name,
  }).from(schoolInvitations).innerJoin(schools, eq(schoolInvitations.schoolId, schools.id)).where(and(
    eq(schoolInvitations.tokenHash, tokenDigest(input.token)),
    gte(schoolInvitations.expiresAt, now),
    isNull(schoolInvitations.acceptedAt),
    isNull(schoolInvitations.revokedAt),
  )).limit(1);
  if (!invite) return null;
  return {
    schoolName: invite.schoolName,
    role: invite.role,
    expiresAt: invite.expiresAt,
    hasLinkedLearner: invite.studentId !== null,
  };
});

export const korvaRouter = router({
  school: router({
    myMemberships: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({
        schoolId: schools.id,
        schoolName: schools.name,
        role: schoolMemberships.role,
        membershipId: schoolMemberships.id,
      }).from(schoolMemberships).innerJoin(schools, eq(schoolMemberships.schoolId, schools.id)).where(and(
        eq(schoolMemberships.userId, ctx.user.id),
        eq(schoolMemberships.status, "active"),
      )).orderBy(asc(schools.name), asc(schoolMemberships.id));
    }),

    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      return db.transaction(async (tx) => {
        const [{ id: schoolId }] = await tx.insert(schools).values({
          name: input.name,
          createdByUserId: ctx.user.id,
        }).$returningId();
        const [{ id: membershipId }] = await tx.insert(schoolMemberships).values({
          schoolId,
          userId: ctx.user.id,
          role: "school_owner",
          status: "active",
        }).$returningId();
        await tx.insert(schoolAuditEvents).values({
          schoolId,
          actorMembershipId: membershipId,
          eventType: "school.created",
          entityType: "school",
          entityId: schoolId,
          details: { name: input.name },
        });
        return { schoolId, schoolName: input.name, role: "school_owner" as const, membershipId };
      });
    }),

    overview: protectedProcedure.input(schoolInput).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      requireCapability(membership.role, "overview.read");
      const [school] = await db.select({ id: schools.id, name: schools.name }).from(schools).where(eq(schools.id, membership.schoolId)).limit(1);
      if (!school) throw new TRPCError({ code: "NOT_FOUND", message: "School not found." });
      if (membership.role === "bursar" || membership.role === "student" || membership.role === "guardian") {
        return { school, role: membership.role, activeClasses: null, activeStudents: null, attendanceRegistersToday: null };
      }
      let visibleClassIds: number[] | null = null;
      if (membership.role === "teacher") {
        const assignments = await db.select({ classId: classTeacherAssignments.classId }).from(classTeacherAssignments).where(and(
          eq(classTeacherAssignments.schoolId, membership.schoolId),
          eq(classTeacherAssignments.membershipId, membership.id),
        ));
        visibleClassIds = assignments.map((row) => row.classId);
      }
      const classConditions = [eq(schoolClasses.schoolId, membership.schoolId), eq(schoolClasses.status, "active")];
      const studentConditions = [eq(students.schoolId, membership.schoolId), eq(students.status, "active")];
      if (visibleClassIds) {
        if (visibleClassIds.length === 0) return { school, role: membership.role, activeClasses: 0, activeStudents: 0, attendanceRegistersToday: 0 };
        classConditions.push(inArray(schoolClasses.id, visibleClassIds));
        studentConditions.push(inArray(students.classId, visibleClassIds));
      }
      const [classCount] = await db.select({ value: sql<number>`count(*)` }).from(schoolClasses).where(and(...classConditions));
      const [studentCount] = await db.select({ value: sql<number>`count(*)` }).from(students).where(and(...studentConditions));
      const [attendanceCount] = await db.select({ value: sql<number>`count(*)` }).from(attendanceSessions).where(and(
        eq(attendanceSessions.schoolId, membership.schoolId),
        eq(attendanceSessions.registerDate, todayIso()),
        ...(visibleClassIds ? [inArray(attendanceSessions.classId, visibleClassIds)] : []),
      ));
      return {
        school,
        role: membership.role,
        activeClasses: Number(classCount?.value ?? 0),
        activeStudents: Number(studentCount?.value ?? 0),
        attendanceRegistersToday: Number(attendanceCount?.value ?? 0),
      };
    }),

    members: protectedProcedure.input(schoolInput).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      requireCapability(membership.role, "members.read");
      return db.select({
        membershipId: schoolMemberships.id,
        name: users.name,
        role: schoolMemberships.role,
        status: schoolMemberships.status,
        joinedAt: schoolMemberships.createdAt,
      }).from(schoolMemberships).innerJoin(users, eq(schoolMemberships.userId, users.id)).where(eq(schoolMemberships.schoolId, membership.schoolId)).orderBy(asc(schoolMemberships.createdAt)).limit(200);
    }),

    createInvitation: protectedProcedure.input(z.object({
      schoolId: positiveId,
      role: z.enum(schoolInviteRoleValues),
      studentId: positiveId.optional(),
    }).superRefine((value, ctx) => {
      if ((value.role === "student" || value.role === "guardian") && value.studentId === undefined) {
        ctx.addIssue({ code: "custom", path: ["studentId"], message: "Link this invitation to a student record." });
      }
      if (value.role !== "student" && value.role !== "guardian" && value.studentId !== undefined) {
        ctx.addIssue({ code: "custom", path: ["studentId"], message: "Student links are only used for student or guardian invitations." });
      }
    })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      if (!canInviteRole(membership.role, input.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot issue that invitation." });
      if (input.studentId) {
        const [student] = await db.select({ id: students.id }).from(students).where(and(
          eq(students.id, input.studentId),
          eq(students.schoolId, membership.schoolId),
          eq(students.status, "active"),
        )).limit(1);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
      }
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const invitationId = await db.transaction(async (tx) => {
        const [{ id }] = await tx.insert(schoolInvitations).values({
          schoolId: membership.schoolId,
          role: input.role,
          studentId: input.studentId ?? null,
          tokenHash: tokenDigest(token),
          createdByMembershipId: membership.id,
          expiresAt,
        }).$returningId();
        await tx.insert(schoolAuditEvents).values({
          schoolId: membership.schoolId,
          actorMembershipId: membership.id,
          eventType: "invitation.created",
          entityType: "invitation",
          entityId: id,
          details: { role: input.role, linkedStudent: input.studentId ?? null },
        });
        return id;
      });
      return { token, expiresAt, role: input.role, invitationId };
    }),

    previewInvitation: invitePreviewProcedure,

    acceptInvitation: protectedProcedure.input(z.object({ token: z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const digest = tokenDigest(input.token);
      const now = new Date();
      return db.transaction(async (tx) => {
        const [invite] = await tx.select().from(schoolInvitations).where(eq(schoolInvitations.tokenHash, digest)).limit(1).for("update");
        if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() < now.getTime()) {
          throw new TRPCError({ code: "NOT_FOUND", message: "This invitation is invalid, expired, or already used." });
        }
        const [existing] = await tx.select({ id: schoolMemberships.id, role: schoolMemberships.role, status: schoolMemberships.status }).from(schoolMemberships).where(and(
          eq(schoolMemberships.schoolId, invite.schoolId),
          eq(schoolMemberships.userId, ctx.user.id),
        )).limit(1);
        const addGuardianLink = Boolean(existing && existing.role === "guardian" && existing.status === "active" && invite.role === "guardian");
        if (existing && !addGuardianLink) throw new TRPCError({ code: "CONFLICT", message: "This account already has a different membership in that school." });
        if ((invite.role === "student" || invite.role === "guardian") && invite.studentId === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "This invitation is incomplete." });
        }
        if (invite.studentId !== null) {
          const [linkedStudent] = await tx.select({ id: students.id }).from(students).where(and(
            eq(students.id, invite.studentId),
            eq(students.schoolId, invite.schoolId),
            eq(students.status, "active"),
          )).limit(1);
          if (!linkedStudent) throw new TRPCError({ code: "NOT_FOUND", message: "The linked student record is no longer available." });
        }
        const membershipId = addGuardianLink ? existing!.id : (await tx.insert(schoolMemberships).values({
          schoolId: invite.schoolId,
          userId: ctx.user.id,
          role: invite.role,
          status: "active",
        }).$returningId())[0]!.id;
        if (invite.studentId !== null) {
          await tx.insert(membershipStudentLinks).values({
            schoolId: invite.schoolId,
            membershipId,
            studentId: invite.studentId,
            linkType: invite.role === "student" ? "self" : "guardian",
          });
        }
        await tx.update(schoolInvitations).set({ acceptedAt: now }).where(and(
          eq(schoolInvitations.id, invite.id),
          isNull(schoolInvitations.acceptedAt),
          isNull(schoolInvitations.revokedAt),
        ));
        await tx.insert(schoolAuditEvents).values({
          schoolId: invite.schoolId,
          actorMembershipId: membershipId,
          eventType: "invitation.accepted",
          entityType: "membership",
          entityId: membershipId,
          details: { role: invite.role, linkedStudent: invite.studentId },
        });
        return { schoolId: invite.schoolId, role: invite.role, membershipId };
      });
    }),
  }),

  classes: router({
    list: protectedProcedure.input(schoolInput).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      requireCapability(membership.role, "classes.read");
      let classIds: number[] | null = null;
      if (membership.role === "teacher") {
        const assignments = await db.select({ classId: classTeacherAssignments.classId }).from(classTeacherAssignments).where(and(
          eq(classTeacherAssignments.schoolId, membership.schoolId),
          eq(classTeacherAssignments.membershipId, membership.id),
        ));
        classIds = assignments.map((row) => row.classId);
        if (!classIds.length) return [];
      }
      const conditions = [eq(schoolClasses.schoolId, membership.schoolId), eq(schoolClasses.status, "active")];
      if (classIds) conditions.push(inArray(schoolClasses.id, classIds));
      return db.select({ id: schoolClasses.id, name: schoolClasses.name, academicYear: schoolClasses.academicYear })
        .from(schoolClasses).where(and(...conditions)).orderBy(asc(schoolClasses.name)).limit(300);
    }),

    create: protectedProcedure.input(z.object({
      schoolId: positiveId,
      name: z.string().trim().min(1).max(100),
      academicYear: z.string().trim().min(4).max(20),
    })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      if (!canManageClasses(membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage classes." });
      try {
        return await db.transaction(async (tx) => {
          const [{ id }] = await tx.insert(schoolClasses).values({
            schoolId: membership.schoolId,
            name: input.name,
            academicYear: input.academicYear,
            status: "active",
            createdByMembershipId: membership.id,
          }).$returningId();
          await tx.insert(schoolAuditEvents).values({
            schoolId: membership.schoolId,
            actorMembershipId: membership.id,
            eventType: "class.created",
            entityType: "class",
            entityId: id,
            details: { name: input.name, academicYear: input.academicYear },
          });
          return { id, name: input.name, academicYear: input.academicYear };
        });
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "That class already exists for this academic year." });
        throw error;
      }
    }),

    assignTeacher: protectedProcedure.input(z.object({ schoolId: positiveId, classId: positiveId, teacherMembershipId: positiveId })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      if (!canManageClasses(membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage class assignments." });
      const [schoolClass] = await db.select({ id: schoolClasses.id }).from(schoolClasses).where(and(
        eq(schoolClasses.id, input.classId),
        eq(schoolClasses.schoolId, membership.schoolId),
        eq(schoolClasses.status, "active"),
      )).limit(1);
      const [teacher] = await db.select({ id: schoolMemberships.id }).from(schoolMemberships).where(and(
        eq(schoolMemberships.id, input.teacherMembershipId),
        eq(schoolMemberships.schoolId, membership.schoolId),
        eq(schoolMemberships.role, "teacher"),
        eq(schoolMemberships.status, "active"),
      )).limit(1);
      if (!schoolClass || !teacher) throw new TRPCError({ code: "NOT_FOUND", message: "Class or active teacher membership not found." });
      try {
        await db.transaction(async (tx) => {
          await tx.insert(classTeacherAssignments).values({
            schoolId: membership.schoolId,
            classId: schoolClass.id,
            membershipId: teacher.id,
            assignedByMembershipId: membership.id,
          });
          await tx.insert(schoolAuditEvents).values({
            schoolId: membership.schoolId,
            actorMembershipId: membership.id,
            eventType: "class.teacher_assigned",
            entityType: "class",
            entityId: schoolClass.id,
            details: { teacherMembershipId: teacher.id },
          });
        });
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "That teacher is already assigned to this class." });
        throw error;
      }
      return { success: true };
    }),
  }),

  students: router({
    list: protectedProcedure.input(z.object({
      schoolId: positiveId,
      search: z.string().trim().max(80).optional(),
      classId: positiveId.optional(),
      limit: z.number().int().min(1).max(100).default(50),
    })).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      if (!roleHasCapability(membership.role, "students.read") && !roleHasCapability(membership.role, "records.self.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your school role cannot access student records." });
      }
      const conditions = [eq(students.schoolId, membership.schoolId)];
      if (input.classId) conditions.push(eq(students.classId, input.classId));
      if (input.search) conditions.push(like(students.fullName, `%${escapeLike(input.search)}%`));
      if (membership.role === "teacher") {
        const assignments = await db.select({ classId: classTeacherAssignments.classId }).from(classTeacherAssignments).where(and(
          eq(classTeacherAssignments.schoolId, membership.schoolId),
          eq(classTeacherAssignments.membershipId, membership.id),
        ));
        const ids = assignments.map((row) => row.classId);
        if (!ids.length) return [];
        conditions.push(inArray(students.classId, ids));
      } else if (membership.role === "student" || membership.role === "guardian") {
        const links = await db.select({ studentId: membershipStudentLinks.studentId }).from(membershipStudentLinks).where(and(
          eq(membershipStudentLinks.schoolId, membership.schoolId),
          eq(membershipStudentLinks.membershipId, membership.id),
          eq(membershipStudentLinks.linkType, membership.role === "student" ? "self" : "guardian"),
        ));
        const ids = links.map((row) => row.studentId);
        if (!ids.length) return [];
        conditions.push(inArray(students.id, ids));
      } else if (!canReadAllStudents(membership.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot access student records." });
      }
      return db.select({
        id: students.id,
        fullName: students.fullName,
        studentNumber: students.studentNumber,
        status: students.status,
        admittedAt: students.admittedAt,
        classId: schoolClasses.id,
        className: schoolClasses.name,
        academicYear: schoolClasses.academicYear,
      }).from(students).innerJoin(schoolClasses, eq(students.classId, schoolClasses.id)).where(and(
        ...conditions,
        eq(schoolClasses.schoolId, membership.schoolId),
      )).orderBy(asc(students.fullName)).limit(input.limit);
    }),

    create: protectedProcedure.input(z.object({
      schoolId: positiveId,
      classId: positiveId,
      fullName: z.string().trim().min(2).max(180),
      studentNumber: z.string().trim().max(80).optional(),
      admittedAt: isoDate,
    })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      if (!canCreateStudents(membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot enroll students." });
      if (input.admittedAt > todayIso()) throw new TRPCError({ code: "BAD_REQUEST", message: "Admission date cannot be in the future." });
      const studentNumber = input.studentNumber?.trim() || null;
      try {
        return await db.transaction(async (tx) => {
          const [schoolClass] = await tx.select({ id: schoolClasses.id, name: schoolClasses.name }).from(schoolClasses).where(and(
            eq(schoolClasses.id, input.classId),
            eq(schoolClasses.schoolId, membership.schoolId),
            eq(schoolClasses.status, "active"),
          )).limit(1).for("update");
          if (!schoolClass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
          const [{ id }] = await tx.insert(students).values({
            schoolId: membership.schoolId,
            classId: schoolClass.id,
            studentNumber,
            fullName: input.fullName,
            status: "active",
            admittedAt: input.admittedAt,
            createdByMembershipId: membership.id,
          }).$returningId();
          await tx.insert(studentHistory).values({
            schoolId: membership.schoolId,
            studentId: id,
            actorMembershipId: membership.id,
            eventType: "enrolled",
            eventDate: input.admittedAt,
            details: { classId: schoolClass.id, className: schoolClass.name, studentNumber },
          });
          await tx.insert(schoolAuditEvents).values({
            schoolId: membership.schoolId,
            actorMembershipId: membership.id,
            eventType: "student.enrolled",
            entityType: "student",
            entityId: id,
            details: { classId: schoolClass.id, admittedAt: input.admittedAt },
          });
          return { id, fullName: input.fullName, studentNumber, classId: schoolClass.id, className: schoolClass.name, status: "active" as const, admittedAt: input.admittedAt };
        });
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "That student number is already used in this school." });
        throw error;
      }
    }),

    placement: protectedProcedure.input(z.object({
      schoolId: positiveId,
      studentId: positiveId,
      newClassId: positiveId.optional(),
      newStatus: z.enum(["active", "transferred", "withdrawn"]).optional(),
      eventDate: isoDate,
      reason: z.string().trim().min(3).max(500),
    }).refine((value) => value.newClassId !== undefined || value.newStatus !== undefined, { message: "Choose a class or status change." })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      if (!canCreateStudents(membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot change student placement." });
      if (input.eventDate > todayIso()) throw new TRPCError({ code: "BAD_REQUEST", message: "Student history dates cannot be in the future." });
      await db.transaction(async (tx) => {
        const [student] = await tx.select().from(students).where(and(
          eq(students.id, input.studentId),
          eq(students.schoolId, membership.schoolId),
        )).limit(1).for("update");
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
        const classIds = [...new Set([student.classId, input.newClassId].filter((id): id is number => id !== undefined))].sort((a, b) => a - b);
        const lockedClasses = await tx.select({ id: schoolClasses.id, name: schoolClasses.name, status: schoolClasses.status }).from(schoolClasses).where(and(
          eq(schoolClasses.schoolId, membership.schoolId),
          inArray(schoolClasses.id, classIds),
        )).orderBy(asc(schoolClasses.id)).for("update");
        const classById = new Map(lockedClasses.map((item) => [item.id, item]));
        const currentClass = classById.get(student.classId);
        const nextClass = input.newClassId === undefined ? currentClass : classById.get(input.newClassId);
        if (!currentClass || !nextClass || (input.newClassId !== undefined && nextClass.status !== "active")) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
        }
        const nextClassId = input.newClassId ?? student.classId;
        const nextStatus = input.newStatus ?? student.status;
        if (nextClassId === student.classId && nextStatus === student.status) throw new TRPCError({ code: "BAD_REQUEST", message: "No student change was selected." });
        await tx.update(students).set({ classId: nextClassId, status: nextStatus }).where(and(
          eq(students.id, student.id),
          eq(students.schoolId, membership.schoolId),
        ));
        if (nextClassId !== student.classId) {
          await tx.insert(studentHistory).values({
            schoolId: membership.schoolId,
            studentId: student.id,
            actorMembershipId: membership.id,
            eventType: "class_changed",
            eventDate: input.eventDate,
            details: { fromClassId: student.classId, fromClassName: currentClass.name, toClassId: nextClassId, toClassName: nextClass.name, reason: input.reason },
          });
        }
        if (nextStatus !== student.status) {
          await tx.insert(studentHistory).values({
            schoolId: membership.schoolId,
            studentId: student.id,
            actorMembershipId: membership.id,
            eventType: "status_changed",
            eventDate: input.eventDate,
            details: { fromStatus: student.status, toStatus: nextStatus, reason: input.reason },
          });
        }
        await tx.insert(schoolAuditEvents).values({
          schoolId: membership.schoolId,
          actorMembershipId: membership.id,
          eventType: "student.placement_changed",
          entityType: "student",
          entityId: student.id,
          reason: input.reason,
          details: { fromClassId: student.classId, toClassId: nextClassId, fromStatus: student.status, toStatus: nextStatus, eventDate: input.eventDate },
        });
      });
      return { success: true };
    }),

    get: protectedProcedure.input(z.object({ schoolId: positiveId, studentId: positiveId })).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      const student = await getAccessibleStudent(db, membership, input.studentId);
      const history = await db.select({
        id: studentHistory.id,
        eventType: studentHistory.eventType,
        eventDate: studentHistory.eventDate,
        recordedAt: studentHistory.recordedAt,
        details: studentHistory.details,
      }).from(studentHistory).where(and(
        eq(studentHistory.schoolId, membership.schoolId),
        eq(studentHistory.studentId, student.id),
      )).orderBy(desc(studentHistory.eventDate), desc(studentHistory.recordedAt)).limit(200);
      let attendance: Array<{ date: string; mark: typeof attendanceRecords.$inferSelect["mark"]; updatedAt: Date }> = [];
      if (membership.role !== "admissions") {
        const attendanceConditions = [
          eq(attendanceRecords.schoolId, membership.schoolId),
          eq(attendanceRecords.studentId, student.id),
          eq(attendanceSessions.schoolId, membership.schoolId),
        ];
        if (membership.role === "teacher") {
          const assignments = await db.select({ classId: classTeacherAssignments.classId }).from(classTeacherAssignments).where(and(
            eq(classTeacherAssignments.schoolId, membership.schoolId),
            eq(classTeacherAssignments.membershipId, membership.id),
          ));
          const classIds = assignments.map((row) => row.classId);
          if (!classIds.length) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
          attendanceConditions.push(inArray(attendanceSessions.classId, classIds));
        }
        attendance = await db.select({
          date: attendanceSessions.registerDate,
          mark: attendanceRecords.mark,
          updatedAt: attendanceRecords.updatedAt,
        }).from(attendanceRecords).innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id)).where(and(...attendanceConditions))
          .orderBy(desc(attendanceSessions.registerDate)).limit(200);
      }
      return { student, history, attendance };
    }),
  }),

  attendance: router({
    register: protectedProcedure.input(z.object({ schoolId: positiveId, classId: positiveId, date: isoDate })).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      const schoolClass = await requireClassAttendanceAccess(db, membership, input.classId);
      const [session] = await db.select().from(attendanceSessions).where(and(
        eq(attendanceSessions.schoolId, membership.schoolId),
        eq(attendanceSessions.classId, schoolClass.id),
        eq(attendanceSessions.registerDate, input.date),
      )).limit(1);
      const roster = await db.select({ id: students.id, fullName: students.fullName, studentNumber: students.studentNumber })
        .from(students).where(and(
          eq(students.schoolId, membership.schoolId),
          eq(students.classId, schoolClass.id),
          eq(students.status, "active"),
        )).orderBy(asc(students.fullName)).limit(500);
      let marks = new Map<number, typeof attendanceRecords.$inferSelect["mark"]>();
      if (session) {
        const records = await db.select({ studentId: attendanceRecords.studentId, mark: attendanceRecords.mark }).from(attendanceRecords).where(and(
          eq(attendanceRecords.schoolId, membership.schoolId),
          eq(attendanceRecords.sessionId, session.id),
        ));
        marks = new Map(records.map((record) => [record.studentId, record.mark]));
      }
      return {
        class: { id: schoolClass.id, name: schoolClass.name, academicYear: schoolClass.academicYear },
        date: input.date,
        sessionId: session?.id ?? null,
        submittedAt: session?.submittedAt ?? null,
        rows: roster.map((student) => ({ studentId: student.id, fullName: student.fullName, studentNumber: student.studentNumber, mark: marks.get(student.id) ?? null })),
      };
    }),

    submit: protectedProcedure.input(z.object({
      schoolId: positiveId,
      classId: positiveId,
      date: isoDate,
      marks: z.array(z.object({ studentId: positiveId, mark: z.enum(attendanceMarkValues) })).min(1).max(500),
    })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      const schoolClass = await requireClassAttendanceAccess(db, membership, input.classId);
      requireCapability(membership.role, "attendance.submit");
      if (input.date > todayIso()) throw new TRPCError({ code: "BAD_REQUEST", message: "Attendance cannot be submitted for a future date." });
      const markByStudent = new Map(input.marks.map((row) => [row.studentId, row.mark]));
      if (markByStudent.size !== input.marks.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Each student can be marked only once." });
      try {
        return await db.transaction(async (tx) => {
          const [lockedClass] = await tx.select({ id: schoolClasses.id }).from(schoolClasses).where(and(
            eq(schoolClasses.id, schoolClass.id),
            eq(schoolClasses.schoolId, membership.schoolId),
            eq(schoolClasses.status, "active"),
          )).limit(1).for("update");
          if (!lockedClass) throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
          const roster = await tx.select({ id: students.id }).from(students).where(and(
            eq(students.schoolId, membership.schoolId),
            eq(students.classId, schoolClass.id),
            eq(students.status, "active"),
          ));
          const rosterIds = new Set(roster.map((row) => row.id));
          if (rosterIds.size === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "This class has no active students." });
          if (markByStudent.size !== rosterIds.size || [...markByStudent.keys()].some((id) => !rosterIds.has(id))) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Mark every current student exactly once before submitting." });
          }
          const [{ id: sessionId }] = await tx.insert(attendanceSessions).values({
            schoolId: membership.schoolId,
            classId: schoolClass.id,
            registerDate: input.date,
            status: "submitted",
            createdByMembershipId: membership.id,
            submittedAt: new Date(),
          }).$returningId();
          await tx.insert(attendanceRecords).values(input.marks.map((row) => ({
            schoolId: membership.schoolId,
            sessionId,
            studentId: row.studentId,
            mark: row.mark,
            markedByMembershipId: membership.id,
          })));
          await tx.insert(schoolAuditEvents).values({
            schoolId: membership.schoolId,
            actorMembershipId: membership.id,
            eventType: "attendance.submitted",
            entityType: "attendance_session",
            entityId: sessionId,
            details: { classId: schoolClass.id, date: input.date, studentCount: input.marks.length },
          });
          return { sessionId, submittedAt: new Date() };
        });
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "An attendance register already exists for this class and date." });
        throw error;
      }
    }),

    correct: protectedProcedure.input(z.object({
      schoolId: positiveId,
      sessionId: positiveId,
      studentId: positiveId,
      mark: z.enum(attendanceMarkValues),
      reason: z.string().trim().min(3).max(500),
    })).mutation(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      requireCapability(membership.role, "attendance.correct");
      const [session] = await db.select().from(attendanceSessions).where(and(
        eq(attendanceSessions.id, input.sessionId),
        eq(attendanceSessions.schoolId, membership.schoolId),
      )).limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Attendance register not found." });
      await requireClassAttendanceAccess(db, membership, session.classId);
      await db.transaction(async (tx) => {
        const [record] = await tx.select().from(attendanceRecords).where(and(
          eq(attendanceRecords.schoolId, membership.schoolId),
          eq(attendanceRecords.sessionId, session.id),
          eq(attendanceRecords.studentId, input.studentId),
        )).limit(1).for("update");
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Attendance mark not found." });
        if (record.mark === input.mark) throw new TRPCError({ code: "BAD_REQUEST", message: "The corrected value must differ from the existing mark." });
        await tx.update(attendanceRecords).set({ mark: input.mark, markedByMembershipId: membership.id }).where(and(
          eq(attendanceRecords.id, record.id),
          eq(attendanceRecords.schoolId, membership.schoolId),
        ));
        await tx.insert(schoolAuditEvents).values({
          schoolId: membership.schoolId,
          actorMembershipId: membership.id,
          eventType: "attendance.mark_corrected",
          entityType: "attendance_record",
          entityId: record.id,
          reason: input.reason,
          details: { sessionId: session.id, studentId: input.studentId, previousMark: record.mark, correctedMark: input.mark },
        });
      });
      return { success: true };
    }),
  }),

  audit: router({
    recent: protectedProcedure.input(z.object({ schoolId: positiveId, limit: z.number().int().min(1).max(100).default(30) })).query(async ({ ctx, input }) => {
      const { db, membership } = await getMembership(ctx.user.id, input.schoolId);
      requireCapability(membership.role, "audit.read");
      return db.select({
        id: schoolAuditEvents.id,
        eventType: schoolAuditEvents.eventType,
        entityType: schoolAuditEvents.entityType,
        entityId: schoolAuditEvents.entityId,
        reason: schoolAuditEvents.reason,
        details: schoolAuditEvents.details,
        createdAt: schoolAuditEvents.createdAt,
      }).from(schoolAuditEvents).where(eq(schoolAuditEvents.schoolId, membership.schoolId)).orderBy(desc(schoolAuditEvents.createdAt)).limit(input.limit);
    }),
  }),

  platform: router({
    aggregate: adminProcedure.query(async () => {
      const db = await requireDb();
      const [schoolCount] = await db.select({ value: sql<number>`count(*)` }).from(schools);
      const [membershipCount] = await db.select({ value: sql<number>`count(*)` }).from(schoolMemberships).where(eq(schoolMemberships.status, "active"));
      const [studentCount] = await db.select({ value: sql<number>`count(*)` }).from(students).where(eq(students.status, "active"));
      return {
        schoolCount: Number(schoolCount?.value ?? 0),
        activeMemberships: Number(membershipCount?.value ?? 0),
        activeStudentRecords: Number(studentCount?.value ?? 0),
      };
    }),
  }),
});

export type KorvaRouter = typeof korvaRouter;
