import { date, foreignKey, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the existing Manus OAuth flow. The global role stays
 * separate from school-scoped memberships; it must never be used as a school role.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const schoolRoleValues = [
  "school_owner",
  "principal",
  "school_admin",
  "admissions",
  "teacher",
  "bursar",
  "student",
  "guardian",
  "inspector",
] as const;
export type SchoolRole = (typeof schoolRoleValues)[number];

export const schoolInviteRoleValues = [
  "principal",
  "school_admin",
  "admissions",
  "teacher",
  "bursar",
  "student",
  "guardian",
  "inspector",
] as const;
export type SchoolInviteRole = (typeof schoolInviteRoleValues)[number];

export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("schools_creator_idx").on(table.createdByUserId)]);

export const schoolMemberships = mysqlTable("school_memberships", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", schoolRoleValues).notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("school_memberships_school_user_uq").on(table.schoolId, table.userId),
  index("school_memberships_user_status_idx").on(table.userId, table.status),
  index("school_memberships_school_role_idx").on(table.schoolId, table.role, table.status),
]);

export const schoolClasses = mysqlTable("school_classes", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  name: varchar("name", { length: 100 }).notNull(),
  academicYear: varchar("academicYear", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdByMembershipId: int("createdByMembershipId").notNull().references(() => schoolMemberships.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("school_classes_school_name_year_uq").on(table.schoolId, table.name, table.academicYear),
  index("school_classes_school_status_idx").on(table.schoolId, table.status),
]);

export const classTeacherAssignments = mysqlTable("class_teacher_assignments", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  classId: int("classId").notNull().references(() => schoolClasses.id),
  membershipId: int("membershipId").notNull().references(() => schoolMemberships.id),
  assignedByMembershipId: int("assignedByMembershipId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("class_teacher_school_class_member_uq").on(table.schoolId, table.classId, table.membershipId),
  index("class_teacher_member_idx").on(table.schoolId, table.membershipId),
  foreignKey({ name: "class_teacher_assigned_by_fk", columns: [table.assignedByMembershipId], foreignColumns: [schoolMemberships.id] }),
]);

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  classId: int("classId").notNull().references(() => schoolClasses.id),
  studentNumber: varchar("studentNumber", { length: 80 }),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  status: mysqlEnum("status", ["active", "transferred", "withdrawn"]).default("active").notNull(),
  admittedAt: date("admittedAt", { mode: "string" }).notNull(),
  createdByMembershipId: int("createdByMembershipId").notNull().references(() => schoolMemberships.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("students_school_number_uq").on(table.schoolId, table.studentNumber),
  index("students_school_class_status_idx").on(table.schoolId, table.classId, table.status),
  index("students_school_name_idx").on(table.schoolId, table.fullName),
]);

export const studentHistory = mysqlTable("student_history", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  studentId: int("studentId").notNull().references(() => students.id),
  actorMembershipId: int("actorMembershipId").notNull().references(() => schoolMemberships.id),
  eventType: varchar("eventType", { length: 48 }).notNull(),
  eventDate: date("eventDate", { mode: "string" }).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  details: json("details").$type<Record<string, string | number | null>>().notNull(),
}, (table) => [
  index("student_history_school_student_date_idx").on(table.schoolId, table.studentId, table.eventDate),
]);

export const membershipStudentLinks = mysqlTable("membership_student_links", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  membershipId: int("membershipId").notNull().references(() => schoolMemberships.id),
  studentId: int("studentId").notNull().references(() => students.id),
  linkType: mysqlEnum("linkType", ["self", "guardian"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("membership_student_link_uq").on(table.schoolId, table.membershipId, table.studentId, table.linkType),
  index("membership_student_student_idx").on(table.schoolId, table.studentId),
]);

export const schoolInvitations = mysqlTable("school_invitations", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  role: mysqlEnum("role", schoolInviteRoleValues).notNull(),
  studentId: int("studentId").references(() => students.id),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  createdByMembershipId: int("createdByMembershipId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
}, (table) => [
  index("school_invitations_school_expiry_idx").on(table.schoolId, table.expiresAt),
  foreignKey({ name: "school_invite_creator_membership_fk", columns: [table.createdByMembershipId], foreignColumns: [schoolMemberships.id] }),
]);

export const attendanceSessions = mysqlTable("attendance_sessions", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  classId: int("classId").notNull().references(() => schoolClasses.id),
  registerDate: date("registerDate", { mode: "string" }).notNull(),
  status: mysqlEnum("status", ["submitted"]).default("submitted").notNull(),
  createdByMembershipId: int("createdByMembershipId").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("attendance_school_class_date_uq").on(table.schoolId, table.classId, table.registerDate),
  index("attendance_school_date_idx").on(table.schoolId, table.registerDate),
  foreignKey({ name: "attendance_session_creator_fk", columns: [table.createdByMembershipId], foreignColumns: [schoolMemberships.id] }),
]);

export const attendanceMarkValues = ["present", "absent", "late", "excused"] as const;
export type AttendanceMarkValue = (typeof attendanceMarkValues)[number];

export const attendanceRecords = mysqlTable("attendance_records", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  sessionId: int("sessionId").notNull().references(() => attendanceSessions.id),
  studentId: int("studentId").notNull().references(() => students.id),
  mark: mysqlEnum("mark", attendanceMarkValues).notNull(),
  markedByMembershipId: int("markedByMembershipId").notNull().references(() => schoolMemberships.id),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("attendance_record_session_student_uq").on(table.sessionId, table.studentId),
  index("attendance_record_school_student_idx").on(table.schoolId, table.studentId),
]);

/** Application API only appends audit rows; there are no update/delete procedures. */
export const schoolAuditEvents = mysqlTable("school_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull().references(() => schools.id),
  actorMembershipId: int("actorMembershipId").notNull().references(() => schoolMemberships.id),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 48 }).notNull(),
  entityId: int("entityId").notNull(),
  reason: varchar("reason", { length: 500 }),
  details: json("details").$type<Record<string, string | number | null>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("school_audit_school_time_idx").on(table.schoolId, table.createdAt),
  index("school_audit_entity_idx").on(table.schoolId, table.entityType, table.entityId),
]);
