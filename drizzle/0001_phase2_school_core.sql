CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`sessionId` int NOT NULL,
	`studentId` int NOT NULL,
	`mark` enum('present','absent','late','excused') NOT NULL,
	`markedByMembershipId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_record_session_student_uq` UNIQUE(`sessionId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`registerDate` date NOT NULL,
	`status` enum('submitted') NOT NULL DEFAULT 'submitted',
	`createdByMembershipId` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_school_class_date_uq` UNIQUE(`schoolId`,`classId`,`registerDate`)
);
--> statement-breakpoint
CREATE TABLE `class_teacher_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`membershipId` int NOT NULL,
	`assignedByMembershipId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `class_teacher_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_teacher_school_class_member_uq` UNIQUE(`schoolId`,`classId`,`membershipId`)
);
--> statement-breakpoint
CREATE TABLE `membership_student_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`membershipId` int NOT NULL,
	`studentId` int NOT NULL,
	`linkType` enum('self','guardian') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `membership_student_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_student_link_uq` UNIQUE(`schoolId`,`membershipId`,`studentId`,`linkType`)
);
--> statement-breakpoint
CREATE TABLE `school_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`actorMembershipId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`entityType` varchar(48) NOT NULL,
	`entityId` int NOT NULL,
	`reason` varchar(500),
	`details` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `school_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`academicYear` varchar(20) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdByMembershipId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `school_classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_classes_school_name_year_uq` UNIQUE(`schoolId`,`name`,`academicYear`)
);
--> statement-breakpoint
CREATE TABLE `school_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`role` enum('principal','school_admin','admissions','teacher','bursar','student','guardian','inspector') NOT NULL,
	`studentId` int,
	`tokenHash` varchar(64) NOT NULL,
	`createdByMembershipId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `school_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_invitations_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `school_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('school_owner','principal','school_admin','admissions','teacher','bursar','student','guardian','inspector') NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `school_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_memberships_school_user_uq` UNIQUE(`schoolId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`studentId` int NOT NULL,
	`actorMembershipId` int NOT NULL,
	`eventType` varchar(48) NOT NULL,
	`eventDate` date NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`details` json NOT NULL,
	CONSTRAINT `student_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schoolId` int NOT NULL,
	`classId` int NOT NULL,
	`studentNumber` varchar(80),
	`fullName` varchar(180) NOT NULL,
	`status` enum('active','transferred','withdrawn') NOT NULL DEFAULT 'active',
	`admittedAt` date NOT NULL,
	`createdByMembershipId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_school_number_uq` UNIQUE(`schoolId`,`studentNumber`)
);
--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_sessionId_attendance_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `attendance_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_markedByMembershipId_school_memberships_id_fk` FOREIGN KEY (`markedByMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_sessions_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_sessions_classId_school_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `school_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_session_creator_fk` FOREIGN KEY (`createdByMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_teacher_assignments` ADD CONSTRAINT `class_teacher_assignments_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_teacher_assignments` ADD CONSTRAINT `class_teacher_assignments_classId_school_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `school_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_teacher_assignments` ADD CONSTRAINT `class_teacher_assignments_membershipId_school_memberships_id_fk` FOREIGN KEY (`membershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_teacher_assignments` ADD CONSTRAINT `class_teacher_assigned_by_fk` FOREIGN KEY (`assignedByMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_student_links` ADD CONSTRAINT `membership_student_links_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_student_links` ADD CONSTRAINT `membership_student_links_membershipId_school_memberships_id_fk` FOREIGN KEY (`membershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `membership_student_links` ADD CONSTRAINT `membership_student_links_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_audit_events` ADD CONSTRAINT `school_audit_events_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_audit_events` ADD CONSTRAINT `school_audit_events_actorMembershipId_school_memberships_id_fk` FOREIGN KEY (`actorMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_classes` ADD CONSTRAINT `school_classes_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_classes` ADD CONSTRAINT `school_classes_createdByMembershipId_school_memberships_id_fk` FOREIGN KEY (`createdByMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_invitations` ADD CONSTRAINT `school_invitations_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_invitations` ADD CONSTRAINT `school_invitations_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_invitations` ADD CONSTRAINT `school_invite_creator_membership_fk` FOREIGN KEY (`createdByMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_memberships` ADD CONSTRAINT `school_memberships_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_memberships` ADD CONSTRAINT `school_memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `schools` ADD CONSTRAINT `schools_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_history` ADD CONSTRAINT `student_history_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_history` ADD CONSTRAINT `student_history_studentId_students_id_fk` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_history` ADD CONSTRAINT `student_history_actorMembershipId_school_memberships_id_fk` FOREIGN KEY (`actorMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_schoolId_schools_id_fk` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_classId_school_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `school_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_createdByMembershipId_school_memberships_id_fk` FOREIGN KEY (`createdByMembershipId`) REFERENCES `school_memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_record_school_student_idx` ON `attendance_records` (`schoolId`,`studentId`);--> statement-breakpoint
CREATE INDEX `attendance_school_date_idx` ON `attendance_sessions` (`schoolId`,`registerDate`);--> statement-breakpoint
CREATE INDEX `class_teacher_member_idx` ON `class_teacher_assignments` (`schoolId`,`membershipId`);--> statement-breakpoint
CREATE INDEX `membership_student_student_idx` ON `membership_student_links` (`schoolId`,`studentId`);--> statement-breakpoint
CREATE INDEX `school_audit_school_time_idx` ON `school_audit_events` (`schoolId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `school_audit_entity_idx` ON `school_audit_events` (`schoolId`,`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `school_classes_school_status_idx` ON `school_classes` (`schoolId`,`status`);--> statement-breakpoint
CREATE INDEX `school_invitations_school_expiry_idx` ON `school_invitations` (`schoolId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `school_memberships_user_status_idx` ON `school_memberships` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `school_memberships_school_role_idx` ON `school_memberships` (`schoolId`,`role`,`status`);--> statement-breakpoint
CREATE INDEX `schools_creator_idx` ON `schools` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `student_history_school_student_date_idx` ON `student_history` (`schoolId`,`studentId`,`eventDate`);--> statement-breakpoint
CREATE INDEX `students_school_class_status_idx` ON `students` (`schoolId`,`classId`,`status`);--> statement-breakpoint
CREATE INDEX `students_school_name_idx` ON `students` (`schoolId`,`fullName`);