# KORVA browser-demo adaptation — outcomes

## 1. KORVA entry screen and clear separation of real sign-in from demo mode
**Status: Complete** — responsive branded entry screen reviewed on desktop and mobile; real sign-in and fictional demo choices are separate.
- Show the responsive KORVA sign-in/demo entry screen based on the supplied hero panel.
- Keep real Manus sign-in distinct from clearly marked demo workspace choices.
- Do not accept an email/password as though it authenticated a real account.
- Keep the starter's real Manus authentication implementation intact; an authenticated identity alone is not interpreted as a school membership or role.
- Authenticated accounts without a configured school membership see a clear no-membership state, not an assumed principal dashboard.

## 2. Role-specific sample workspaces and browser-only demo data
**Status: Complete** — implemented ten independent role dashboards and menus; browser review confirmed distinct owner, student, bursar, guardian, and inspector experiences.
- Provide distinct sample workspaces for school owner, principal, school administrator, admissions officer, teacher, bursar, student, parent/guardian, inspector, and KORVA platform administrator.
- Each role sees its own task-focused dashboard; do not reuse a shared dashboard or the same role-independent metrics/actions. The school owner sees school-wide outcomes; the principal sees academic and attendance oversight; the school administrator sees school operations; the admissions officer sees learner enrollment; teachers see assigned classes and learning work; the bursar sees finance tasks; students see only their own learning; guardians see only linked learner information; inspectors see read-only school aggregates; platform administrators see tenant aggregates only.
- Student and guardian workspaces cannot take attendance. Students cannot manage fees or view classmates. Teachers cannot register students or access finance. Bursars do not receive academic-record or sensitive health/safeguarding access. Inspectors and platform administrators cannot open individual student records.
- Each role has navigation and actions limited to its school responsibilities. Buttons into unfinished areas lead to a visibly planned screen, not a false claim that the workflow is live.
- Show a conspicuous “DEMO DATA — stored only in this browser” notice inside every demo workspace.
- Use fictional seeded data, isolated by sample school. State that role controls and records in this prototype are front-end demonstrations, not a production authorization boundary.

## 3. Dashboard, school context, utilities, and responsive navigation
**Status: Complete** — every role renders its own school, classroom, finance, family, learner, oversight, or tenant view with role-specific navigation and actions.
- Provide a separate role-specific dashboard for each demo role with role-appropriate school or personal context, metrics, activity, and quick actions; share the branded shell and utilities only, not dashboard content.
- Keep school or learner context, network state, persisted browser-local-change indicator, mobile menu, dark/light theme toggle, explicit role switching, and exit back to the entry screen.
- Support keyboard operation, visible focus, semantic labels, mobile-overflow handling, safe text rendering, and reduced motion.

## 4. Searchable students and detailed dated student records
**Status: Complete** — opened a sample student panel and reviewed its enrollment, guardian, attendance, published reports, finance boundary, event timeline, and separate dates.
- Provide a searchable student directory.
- Opening a student shows a detailed, dated synthetic record: profile and enrollment information, guardian link, class/enrollment history, attendance, assessment/report examples, finance summary only for a finance-permitted school leader view, and an activity timeline.
- Preserve event date and entry/change date separately when shown.
- Do not expose student details in the platform aggregate view.

## 5. Student registration, duplicate check, and local audit history
**Status: Complete** — added a fictional QA student, confirmed its enrollment date and history in the profile, then reset the demo back to the original 28 seed records.
- Student registration validates full name, guardian name, and class.
- Detects a likely duplicate and requests explicit second confirmation.
- Creates a fictional student record with a dated enrollment event and audit entry.

## 6. Attendance workflow and correction accountability
**Status: Complete** — teacher register showed only the two assigned sample classes; source implements required marks, correction-reason gating, and activity history.
- Attendance is per school, class, and date.
- Require a mark for every listed student before submission; unmarked does not mean absent.
- Allow configured demo states: present, absent, late, and excused.
- Corrections require a reason and create an audit-history entry.
- Teacher is limited to assigned demo classes; leader can manage all sample classes.

## 7. Honest offline behavior and local persistence
**Status: Complete** — attendance and student registration edits are saved in browser storage; the local-only change count persists across reloads and is never presented as server synchronization.
- Demonstrate poor-connectivity behavior honestly: save supported offline attendance and student-registration edits locally and show their local-only status across reloads. When the browser comes back online, update only the connectivity indicator; do not upload or automatically clear those changes.
- Explicitly state that local demo changes are not synchronized to a server or another device, including after connectivity returns.
- Keep sample data in versioned browser storage and isolate it by sample school.

## 8. Accurate roadmap states for unfinished modules
**Status: Complete** — unfinished areas render explicit planned/future cards and are not presented as active workflows.
- Keep unfinished product areas (classes, assessments/results, finance, learning, forums/communications, leaderboards, national reporting, sync centre) visibly labelled planned/future unless an interaction is genuinely implemented.
- Make roadmap phase badges clear and prevent inert quick-action buttons from masquerading as live features.

## 9. Preserve the existing project stack and safe development workflow
**Status: Complete** — app changes remain in the existing React/Vite project, preserve existing auth and managed server/database, and add no school-record APIs or schema changes.
- Reuse the existing React/Vite/Express/tRPC/Drizzle project structure and installed dependencies.
- Preserve the starter's Manus OAuth/session implementation and managed server/database setup.
- Do not switch to Supabase, alter the database schema, reset/seed the shared managed database, or claim server-enforced authorization, shared persistence, backup, or production synchronization for local demo data.
- Preserve current project files and existing auth behavior outside the intended UI adaptation.
- Declare actual client page routes in `public/manus-routes.json` before the first dev-server start and keep the manifest accurate.

## 10. Apply the uploaded school-dashboard design reference
**Status: Complete** — recreated the screenshot’s navy/gold navigation, school masthead, colored KPI strip, performance/leaderboard/quick-action panels, and activity/lower dashboard panels as responsive components while keeping KORVA branding.
- Use the uploaded image as the complete visual reference: deep-navy school navigation rail with gold active state; school identity masthead; bold blue/gold KPI cards; central performance and leaderboard area beside role-specific quick actions; and lower class-performance, activity, and brand panels.
- Apply the reference's visual hierarchy, spacing, palette, icons, and typography to every role experience, changing content and actions to match that role.
- Build responsive, interactive components rather than displaying the screenshot as a static image. Keep the KORVA name and “RISE. LEARN. LEAD.” identity.
- Do not imply the screenshot's example counts, rankings, named people, school crest or external connections are live school data or verified integrations; any added sample values remain visibly fictional.
