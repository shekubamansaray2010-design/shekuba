import { FormEvent, useState } from "react";
import { CircleAlert, Copy, Link2, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { SchoolRole } from "./real-school-types";

type InviteRole = "principal" | "school_admin" | "admissions" | "teacher" | "bursar" | "student" | "guardian" | "inspector";
const OWNER_INVITES: InviteRole[] = ["principal", "school_admin", "admissions", "teacher", "bursar", "student", "guardian", "inspector"];
const ADMIN_INVITES: InviteRole[] = ["admissions", "teacher", "bursar", "student", "guardian"];
const canInvite = (role: SchoolRole) => role === "school_owner" || role === "school_admin";
const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());

export default function RealPeoplePanel({ schoolId, role }: { schoolId: number; role: SchoolRole }) {
  const [inviteRole, setInviteRole] = useState<InviteRole>(role === "school_owner" ? "principal" : "teacher");
  const [studentId, setStudentId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const roles = role === "school_owner" ? OWNER_INVITES : ADMIN_INVITES;
  const members = trpc.korva.school.members.useQuery({ schoolId });
  const students = trpc.korva.students.list.useQuery({ schoolId, limit: 100 }, { enabled: canInvite(role) && (inviteRole === "student" || inviteRole === "guardian") });
  const createInvite = trpc.korva.school.createInvitation.useMutation({
    onSuccess: (result) => {
      const link = new URL(window.location.origin);
      link.hash = `invite=${result.token}`;
      setInviteLink(link.toString());
      setMessage(`${label(result.role)} invitation created. It is single-use and expires in 72 hours.`);
    },
  });

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setInviteLink("");
    createInvite.mutate({ schoolId, role: inviteRole, studentId: inviteRole === "student" || inviteRole === "guardian" ? Number(studentId) : undefined });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage("Invite link copied. Share it privately with the intended person.");
    } catch {
      setMessage("Copy was blocked by this browser. Select and copy the link below, then share it privately.");
    }
  }

  return <section className="korva-live-panel">
    <div className="korva-live-panel-head"><div><span className="korva-live-eyebrow">SCHOOL ACCESS</span><h2><UsersRound size={20} /> People & role invitations</h2><p>Membership is attached to a signed-in account and this school. Roles are checked by the server.</p></div></div>
    {canInvite(role) ? <form className="korva-live-form korva-live-inline-form" onSubmit={submitInvite}>
      <label>Invite role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as InviteRole)}>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      {(inviteRole === "student" || inviteRole === "guardian") && <label>Linked student<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Choose active student</option>{(students.data ?? []).filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.studentNumber ? ` · ${item.studentNumber}` : ""}</option>)}</select></label>}
      <button type="submit" className="korva-live-button primary" disabled={createInvite.isPending || ((inviteRole === "student" || inviteRole === "guardian") && !studentId)}><Link2 size={15} />{createInvite.isPending ? "Creating…" : "Create invite link"}</button>
      <p className="korva-live-footnote korva-live-full">No email or text message is sent. The 72-hour single-use link is a bearer invitation: anyone who receives it can claim that role, so share it privately.</p>
    </form> : <div className="korva-live-notice">Your role can view this school’s memberships but cannot issue invitations.</div>}
    {createInvite.error && <p className="korva-live-error" role="alert"><CircleAlert size={15} />{createInvite.error.message}</p>}
    {message && <p className="korva-live-success" role="status">{message}</p>}
    {inviteLink && <div className="korva-live-invite-output"><label htmlFor="invite-link">Private invitation link</label><div><input id="invite-link" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="korva-live-button secondary" onClick={copyLink}><Copy size={15} /> Copy</button></div></div>}
    <h3 className="korva-live-subtitle">Current memberships</h3>
    {members.isLoading && <p className="korva-live-muted">Loading authorized school memberships…</p>}
    {members.error && <p className="korva-live-error" role="alert">{members.error.message}</p>}
    {!!members.data?.length && <div className="korva-live-member-list">{members.data.map((member) => <article key={member.membershipId}><span className="korva-live-member-avatar">{(member.name || "M").slice(0, 1).toUpperCase()}</span><div><strong>{member.name || "Signed-in member"}</strong><small>Joined {new Date(member.joinedAt).toLocaleDateString()}</small></div><span className="korva-live-status submitted">{label(member.role)}</span></article>)}</div>}
  </section>;
}
