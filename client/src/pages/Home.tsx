import { useState } from "react";
import { ArrowRight, Eye, GraduationCap, ShieldCheck, TriangleAlert } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import KORVADemo from "@/components/korva/KORVADemo";
import type { DemoRole } from "@/lib/korva-demo";

const DEMO_ROLE_GROUPS: { label: string; roles: { id: DemoRole; title: string; description: string; initials: string }[] }[] = [
  { label: "School team", roles: [
    { id: "owner", title: "School owner", description: "School-wide outcomes and oversight", initials: "SO" },
    { id: "principal", title: "Principal", description: "Academic progress and approvals", initials: "PR" },
    { id: "school_admin", title: "School administrator", description: "Daily operations and records", initials: "SA" },
    { id: "admissions", title: "Admissions officer", description: "New learners and enrollment", initials: "AO" },
    { id: "teacher", title: "Teacher", description: "Assigned classes and learning", initials: "TN" },
    { id: "bursar", title: "Bursar", description: "Fees, receipts and reconciliation", initials: "BU" },
  ] },
  { label: "Learners & families", roles: [
    { id: "student", title: "Student", description: "Your classes, learning and results", initials: "ST" },
    { id: "guardian", title: "Parent / guardian", description: "Your linked learner’s progress", initials: "PG" },
  ] },
  { label: "Oversight", roles: [
    { id: "inspector", title: "School inspector", description: "Read-only school-level overview", initials: "IN" },
    { id: "platform", title: "KORVA platform admin", description: "Aggregate tenant operations", initials: "KA" },
  ] },
];

function BrandMark({ size = 38 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="korva-brand-mark-svg"><path d="M2 20 16 4l14 16-8-3-6 9-6-9z" fill="currentColor" /></svg>;
}

export default function Home() {
  const auth = useAuth();
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);
  const [loginError, setLoginError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  if (demoRole) return <KORVADemo key={demoRole} initialRole={demoRole} onExit={() => setDemoRole(null)} />;

  const login = () => {
    setLoginError("");
    try {
      startLogin();
    } catch (error) {
      console.error("KORVA sign-in could not start", error);
      setLoginError("Real Manus sign-in isn’t configured in this environment. You can still explore the separate fictional demo workspaces.");
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await auth.logout();
    } catch (error) {
      console.error("KORVA sign-out did not complete", error);
      setLogoutError("Sign-out could not be completed right now. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return <main className="korva-entry">
    <section className="korva-entry-hero">
      <div className="korva-entry-hero-inner">
        <a className="korva-entry-brand" href="/" aria-label="KORVA home"><span className="korva-entry-mark"><BrandMark /></span><span>KORVA</span></a>
        <div className="korva-entry-copy">
          <span className="korva-entry-kicker"><span /> A CLEARER SCHOOL DAY</span>
          <h1>Rise.<br /><em>Learn.</em><br />Lead.</h1>
          <p>One connected place for school operations, teaching, learning, families, and the people helping every student move forward.</p>
          <div className="korva-hero-rule" />
          <div className="korva-entry-promise"><span className="korva-promise-icon"><ShieldCheck size={17} /></span><span>Built around the right records, the right role, and the right next step.</span></div>
        </div>
        <div className="korva-hero-bottom"><span>SIERRA LEONE</span><span>EDUCATION · COMMUNITY · PROGRESS</span></div>
      </div>
      <div className="korva-hero-decoration" aria-hidden="true"><div className="korva-orbit orbit-one" /><div className="korva-orbit orbit-two" /><div className="korva-orbit orbit-three" /><span className="korva-hero-star">✦</span></div>
    </section>

    <section className="korva-entry-panel">
      <div className="korva-entry-panel-inner">
        <div className="korva-entry-mobile-brand"><BrandMark size={30} /><span>KORVA</span></div>
        <div className="korva-entry-heading"><span className="korva-eyebrow">YOUR SCHOOL WORKSPACE</span><h2>{auth.user ? "Account connected" : "Sign in to KORVA"}</h2><p>{auth.user ? "Your identity is signed in. A school role is assigned separately by the school." : "Continue with your Manus account, or explore a clearly labelled sample workspace."}</p></div>

        {auth.loading ? <div className="korva-auth-state" role="status"><span className="korva-spinner" />Checking your account…</div> : auth.user ? <div className="korva-authenticated-card">
          <div className="korva-auth-avatar">{(auth.user.name || auth.user.email || "M").slice(0, 1).toUpperCase()}</div>
          <div className="korva-auth-user"><strong>{auth.user.name || "Signed-in member"}</strong><span>{auth.user.email || "Manus account"}</span></div>
          <span className="korva-auth-check"><ShieldCheck size={17} /></span>
          <p className="korva-auth-notice"><TriangleAlert size={15} />This confirms your account identity only. It does not create a school membership or grant a school role. KORVA will show school records only after an authorized membership is assigned.</p>
          {logoutError && <p className="korva-entry-error" role="alert">{logoutError}</p>}
          <button className="korva-auth-button secondary" onClick={logout} disabled={loggingOut}>{loggingOut ? "Signing out…" : "Sign out"}</button>
        </div> : <>
          <button className="korva-auth-button" onClick={login}><span className="korva-manus-symbol">M</span><span>Continue with Manus</span><ArrowRight size={17} /></button>
          {loginError && <p className="korva-entry-error" role="alert"><TriangleAlert size={15} />{loginError}</p>}
          <div className="korva-entry-divider"><span /> <small>OR EXPLORE A DEMO</small> <span /></div>
          <div className="korva-demo-heading"><div><span className="korva-demo-dot" /> <strong>Choose your school role</strong></div><span>Fictional data</span></div>
          <div className="korva-demo-role-groups">{DEMO_ROLE_GROUPS.map((group) => <section className="korva-demo-role-group" key={group.label}>
            <h3>{group.label}</h3><div className="korva-role-list">{group.roles.map((item) => <button className="korva-role-option" key={item.id} onClick={() => setDemoRole(item.id)}>
              <span className={`korva-role-avatar ${item.id}`}>{item.initials}</span><span className="korva-role-copy"><strong>{item.title}</strong><small>{item.description}</small></span><ArrowRight className="korva-role-arrow" size={17} />
            </button>)}</div>
          </section>)}</div>
          <p className="korva-entry-hint"><Eye size={15} /> Demo mode is separate from real sign-in. Sample edits stay in this browser.</p>
        </>}
        <div className="korva-entry-footer"><span><GraduationCap size={15} /> Designed for school communities</span><span>RISE. LEARN. LEAD.</span></div>
      </div>
    </section>
  </main>;
}
