# KORVA browser-demo adaptation — outcomes

## 1. KORVA entry screen and clear separation of real sign-in from demo mode
**Status: Complete** — responsive branded entry screen reviewed on desktop and mobile; real sign-in and fictional demo choices are separate.
- Show the responsive KORVA sign-in/demo entry screen based on the supplied hero panel.
- Keep real Manus sign-in distinct from clearly marked demo workspace choices.
- Do not accept an email/password as though it authenticated a real account.
- Keep the starter's real Manus authentication implementation intact; an authenticated identity alone is not interpreted as a school membership or role.
- Authenticated accounts without a configured school membership see a clear no-membership state, not an assumed principal dashboard.

## 2. Role-specific sample workspaces and browser-only demo data
**Status: Complete** — school leader and teacher views were opened and role navigation/assigned classes inspected; platform aggregate view stays separate.
- Provide the sample workspaces: school leader, teacher, and platform administrator.
- Each demo role sees only its role-appropriate navigation and allowed demo actions.
- The platform administrator view shows aggregate school details only and does not open student records.
- Teacher demo cannot register students or edit finance; school leader demo can add fictional students and submit/correct attendance in this browser demo.
- Show a conspicuous “DEMO DATA — stored only in this browser” notice inside every demo workspace.
- Use fictional seeded data, isolated by sample school. State that role controls and records in this prototype are front-end demonstrations, not a production authorization boundary.

## 3. Dashboard, school context, utilities, and responsive navigation
**Status: Complete** — dashboard reviewed in both school leader and teacher workspaces; mobile/desktop entry layouts rendered.
- Provide a dashboard with school and role context, demo metrics, activity history, quick actions, network state, local-pending indicator, mobile menu, dark/light theme toggle, and sign-out back to the entry screen.
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
