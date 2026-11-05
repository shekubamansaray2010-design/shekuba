# KORVA website demo — presenter notes

## Open the demo

Open the KORVA project’s **Preview** in Manus. The entry screen has two separate paths: **Continue with Manus** for the existing account sign-in, and three explicitly fictional sample workspaces for the school leader, teacher, and platform administrator.

## Suggested walkthrough

1. Start with the school leader dashboard: school context, daily overview, quick actions, workload and needs-attention cards.
2. Open **Students**, search or open a sample learner, then show the dated profile and timeline. The profile distinguishes when an event happened from when it was entered. Finance details appear only in the school-leader demo.
3. In **Attendance**, choose a class, mark every learner, and submit. Unmarked learners are not treated as absent. A previously submitted register loads its saved marks and requires a reason before a correction can be saved.
4. Switch to the teacher role using the top-right initials. Show its different dashboard, only assigned classes, and the absence of finance and student-registration actions.
5. Use **Exit demo** to return to the role chooser. The platform-admin sample is aggregate-only.

## Important prototype boundary

The “DEMO DATA” banner is intentional. Sample records and edits are fictional and saved only in this browser; they are not written to KORVA’s managed database, synchronized across devices, or protected by production server-side school permissions. Offline edits remain marked as local after connectivity returns; the demo does not upload them or claim to have reconciled them. Unfinished modules are labelled planned. Real school membership provisioning, full school-record persistence, external messaging/payment/government integrations and production-grade multi-tenant policies remain future implementation work.

## Build checks

Project checks: `pnpm check`, `pnpm test`, and `pnpm build`.
