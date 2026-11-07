# KORVA implementation plan

## Phase 1 — browser-demo adaptation

Phase 1 is complete. It adapted the supplied `/home/ubuntu/upload/korva.html` into the existing `/home/ubuntu/korva` React/TypeScript application as a clearly labelled interactive browser demo, not production school software. The demo retains KORVA branding, the navy/blue/gold palette, the role-aware navigation, sample records, and working demo interactions.

Keep the existing React/Vite/Express/tRPC/Drizzle structure and Manus-managed server/database configuration. Do not switch to Supabase or another identity provider. Keep the starter's real Manus authentication intact; a real authenticated identity alone is not a school membership or role. Demo role selection remains separate from application authentication and exposes only synthetic records in browser storage. Do not imply that demo records are shared, backed up, or protected by server authorization.

## Design

Use the user's Saint Edward’s school-dashboard screenshot as the full visual reference: a deep-navy branded left rail with bright gold active item; a school identity/banner header; large alternating blue and gold KPI cards; academic performance, leaderboard, and role-specific quick actions; and lower panels for class performance, recent activity, and an aspirational brand panel. Carry this hierarchy, contrast, icon weight, compact typography, and spacing across every role workspace, changing content to match the active role. Keep the KORVA name and “RISE. LEARN. LEAD.” identity. Rebuild the interface as responsive HTML components, not a static screenshot. Use Public Sans for interface text with Source Serif 4 / Georgia-style headings and system fallbacks. Preserve readable contrast and accessible mobile navigation.

Design movement: contemporary Sierra Leone school operations dashboard inspired by the user's supplied screenshot. Core principles: strong school identity; glanceable blue/gold information hierarchy; role-specific work; accessible contrast. Layout paradigm: left navigation rail, school masthead, KPI band, role-tailored analytics and action panels, collapsing to a usable mobile stack. Interaction philosophy: direct controls, explicit save/submit states, useful validation, and no hidden irreversible behavior. Motion is subtle, brief, and disabled for reduced-motion preferences. Brand essence: a confident, practical school operations workspace; personality: trustworthy, clear, capable. Brand voice: “See the school day clearly.” and “Your class. Your register. One clear record.” Keep the KORVA rise mark and wordmark. Signature color: KORVA navy `#071B43`; supporting blue `#1557B0` and gold `#D6A12B`.

## Phase 1 user-facing behavior — delivered

- Provide a responsive KORVA sign-in/demo entry screen. Keep real Manus sign-in distinct from clearly marked demo workspace choices; do not accept an email/password as though it authenticated a real account.
- Provide separate demo workspaces for school owner, principal, school administrator, admissions officer, teacher, bursar, student, parent/guardian, inspector, and KORVA platform administrator. Each role has its own task-focused title, metrics, activity, quick actions, and navigation. Students see only their own learning; guardians see only a linked learner; inspectors see school aggregates; platform administrators see tenant aggregates only. Student and guardian roles cannot take attendance; students cannot manage fees or see classmates; teachers cannot register students or see finance; bursars do not get sensitive health/safeguarding access. These are interface demonstrations, not production authorization.
- Show a persistent “DEMO DATA — stored only in this browser” notice. Use fictional seeded data isolated by sample school; clearly state that demo records and role controls are not a production authorization boundary.
- Provide searchable student directory and detailed dated synthetic records. Student registration validates required values, detects likely duplicates and asks for confirmation, and creates a dated local event. Attendance is per school/class/date; require a mark for every student; corrections require a reason and add local history.
- Persist supported offline demo changes in browser storage without upload or auto-clear on reconnect. Keep unfinished features labelled planned/future.
- Support keyboard operation, focus visibility, semantic labels, mobile overflow, safe text rendering, and reduced motion.

## Phase 2 — secure school-data foundation

The user asked to continue to Phase 2. Preserve Phase 1 as a separate demo and implement a small real-data core through the existing Manus OAuth identity, server, tRPC, Drizzle, and MySQL setup. Do not create a separate email/password system or replace Manus OAuth.

### Onboarding and memberships

- A signed-in user without a school membership can create a new school; the authenticated creator receives the first `school_owner` membership. School creation and owner membership are one transaction. Do not assume a role from a browser-selected demo role.
- A school owner can create one-time, role-bound membership invitations. Store only a cryptographic token hash, bind the invitation to the school, intended role, expiry, and optional learner record, and allow a signed-in account to accept it once. Use an expiry of 72 hours. Show that invitation links are bearer secrets and must be shared privately. Do not claim to email invitations; no customer messaging provider is configured.
- A user with memberships explicitly selects an active school/membership. A user may belong to more than one school. School and role data are loaded from server-side records.
- Keep global platform administration separate from school membership. The existing platform-level administrator can see tenant aggregates only through a narrowly scoped administrative endpoint; it cannot access student records through that endpoint.

### Server authorization and data boundary

- Define school-scoped membership roles: `school_owner`, `principal`, `school_admin`, `admissions`, `teacher`, `bursar`, `student`, `guardian`, and `inspector`. Keep platform administrator as a separate global permission; never allow a school owner to create a platform administrator.
- Every authenticated school operation must verify the caller's active membership and requested school on the server. Every query/mutation filters by authorized `schoolId`; reject cross-tenant IDs rather than trusting client-supplied role or school context.
- Teachers can read and operate attendance only for explicitly assigned classes and cannot enroll students or access finance. Admissions and authorized school leaders can manage student enrollment. Bursars receive no academic, health, or safeguarding access; finance workflows remain a later phase. Student and guardian accounts can only read records linked to their own student/guardian membership; they cannot enter attendance or edit grades. Inspectors and platform administrators receive aggregate-only results.
- Use Zod input validation, safe bounded list queries, appropriate `UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND` responses, and append-only application audit events for sensitive changes. Do not return secrets or invite token hashes.

### Persistent core workflows

- Add schools, memberships, invitations, school classes/streams, teacher-class assignments, student profiles, linked student accounts, attendance sessions/marks, student-history events, and audit records as required for this stage.
- Authorized admissions/school staff can create and search students, assign a class, and view a dated profile/history. Keep personal fields minimal (name, school-assigned number if provided, class, status, admission date); do not introduce health or safeguarding fields in Phase 2.
- An assigned teacher can open a class/date register, mark each current student present/absent/late/excused, and submit only when all current students have a mark. Prevent duplicate registers for the same school/class/date. Later corrections require a reason and append an audit event with actor and timestamps.
- Server-backed dashboard and student/attendance screens must not read or write the browser-only demo database. Keep demo mode separate and visibly marked.

### Schema, safety, deployment, and deferred work

- Use the already selected managed MySQL database. Schema migrations must be additive and reviewed before execution. Development and published deployments share this database; do not seed it, import real student data, update/delete existing user records, or perform destructive DDL during Phase 2. Generate a deterministic migration, inspect it, apply only the additive migration, and verify table structure without exposing student data.
- Keep tests isolated from the shared managed database using unit tests, mocked queries, or a disposable test harness. Do not use live student records as test fixtures.
- Do not implement real payments, fee ledgers, external SMS/email, WhatsApp, government reporting, file exports containing student details, health/safeguarding case data, automated decisions, or cross-device offline synchronization in Phase 2. Keep those modules explicitly planned.
- Preserve the current deployment behavior, but remember `publishing.auto_publish` is enabled: pushing a new accepted checkpoint triggers publication. Run the reviewed build and authorization checks before creating the checkpoint; do not initiate a separate publish operation.

## Implementation structure

- `client/src/pages/Home.tsx`: keep the real OAuth entry and separate demo selection. After login, show an authenticated school workspace, membership selector, or no-membership onboarding; never assume principal access.
- `client/src/components/korva/`: retain demo components; add a distinct real-school workspace, school onboarding/invitation, student directory/profile, and attendance UI. Share presentation shell only where real and demo data remain clearly separated.
- `client/src/lib/korva-demo.ts`: preserve browser-only fictional demo models and migrations; do not repurpose it as the real-data source.
- `client/src/lib/` and `server/`: add typed school/attendance API client hooks, tRPC routers, permission helpers, and server-side data services. Keep the logged-in `ctx.user` identity from the existing OAuth session.
- `drizzle/schema.ts`, `drizzle/relations.ts`, and `drizzle/`: add the reviewed additive schema and migration. Keep existing users/auth data intact.
- `server/db.ts`: implement school/membership/student/class/attendance queries with school-scope validation. Keep all role decisions on the server.
- `TODO.md`: track independently deliverable Phase 2 outcomes and preserve each acceptance clause until its evidence is delivered.

## Dependencies and material constraints

Use installed React, TypeScript, Wouter, Tailwind, lucide-react, tRPC, Drizzle, Express, and the existing UI kit. Avoid new packages unless implementation proves necessary. No decorative image generation is needed. The cloud development server uses the configured port 3000. Real school data and authorization are only implemented to the Phase 2 scope above; backups/restoration, messaging/payment providers, government integrations, and broader school workflows remain later phases.