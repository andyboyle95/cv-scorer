"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Globe, Activity, ArrowLeft, Plus, Loader2, Shield, RefreshCw, X, BarChart3, Inbox, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

type Role = "ADMIN" | "USER";

interface UserRow {
  email: string;
  role: Role;
  source: "individual" | "domain";
  revokedAt: string | null;
  addedBy: string | null;
  loginCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

interface DomainRow {
  id: string;
  domain: string;
  role: Role;
  addedBy: string;
  createdAt: string;
}

interface AuditRow {
  id: string;
  type: string;
  actor: string;
  target: string | null;
  meta: unknown;
  createdAt: string;
}

interface Stats {
  loginsToday: number;
  activeUsersThisWeek: number;
  totalLogins: number;
}

interface UsageRow {
  tool: string;
  action: string;
  count: number;
}

interface LeadRow {
  id: string;
  name: string;
  email: string;
  companyUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  seniority: string | null;
  notifyStatus: string;
  notifyError: string | null;
  copyStatus: string;
  copyError: string | null;
  createdAt: string;
}

interface LeadEmailConfig {
  hasApiKey: boolean;
  from: string;
  isTestSender: boolean;
  notify: string[];
  problems: string[];
}

interface LeadsPayload {
  leads: LeadRow[];
  total: number;
  undelivered: number;
  config: LeadEmailConfig;
  tableReady: boolean;
  error?: string;
}

interface UsageStats {
  totals: { today: number; thisWeek: number; allTime: number };
  today: UsageRow[];
  thisWeek: UsageRow[];
  allTime: UsageRow[];
  topUsers: Array<{ email: string | null; count: number }>;
}

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "domains" | "activity" | "usage" | "leads">("users");
  const [leads, setLeads] = useState<LeadsPayload | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const [s, u, d, a, up, ld] = await Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/domains").then((r) => r.json()),
      fetch("/api/admin/activity").then((r) => r.json()),
      fetch("/api/admin/usage-stats").then((r) => r.json()),
      fetch("/api/admin/leads").then((r) => r.json()).catch(() => null),
    ]);
    setStats(s);
    setUsers(u.users ?? []);
    setDomains(d.domains ?? []);
    setActivity(a.events ?? []);
    setUsage(up ?? null);
    setLeads(ld ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll();
    // Silent refresh every 30s so the activity log feels live.
    const t = setInterval(refreshAll, 30_000);
    return () => clearInterval(t);
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <Header title="Admin" />

      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a3668]">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#df2681]" />
          <h1 className="text-base font-semibold text-[#1a3668]">Access Management</h1>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="text-xs gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile label="Logins today" value={stats?.loginsToday} />
          <StatTile label="Active users this week" value={stats?.activeUsersThisWeek} />
          <StatTile label="Total logins ever" value={stats?.totalLogins} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users}>
            Users
          </TabButton>
          <TabButton active={tab === "domains"} onClick={() => setTab("domains")} icon={Globe}>
            Domains
          </TabButton>
          <TabButton active={tab === "usage"} onClick={() => setTab("usage")} icon={BarChart3}>
            Usage
          </TabButton>
          <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={Inbox}>
            Leads
            {leads && leads.undelivered > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                {leads.undelivered}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")} icon={Activity}>
            Activity
          </TabButton>
        </div>

        {tab === "users" && <UsersTab users={users} onChange={refreshAll} />}
        {tab === "domains" && <DomainsTab domains={domains} onChange={refreshAll} />}
        {tab === "usage" && <UsageTab usage={usage} />}
        {tab === "leads" && <LeadsTab data={leads} onChange={refreshAll} />}
        {tab === "activity" && <ActivityTab events={activity} />}
      </main>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1a3668]">
        {value === undefined ? <Loader2 className="h-5 w-5 animate-spin text-gray-300" /> : value.toLocaleString()}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active ? "border-[#df2681] text-[#1a3668]" : "border-transparent text-gray-500 hover:text-[#1a3668]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// ─── Users tab ──────────────────────────────────────────────────────────────

function UsersTab({ users, onChange }: { users: UserRow[]; onChange: () => void }) {
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("USER");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const setBusy = (email: string, busy: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (busy) n.add(email);
      else n.delete(email);
      return n;
    });

  const addUser = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Failed to add user");
        return;
      }
      setNewEmail("");
      setNewRole("USER");
      onChange();
    } finally {
      setAdding(false);
    }
  };

  const patchUser = async (email: string, patch: { role?: Role; revoked?: boolean }) => {
    setBusy(email, true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Update failed");
        return;
      }
      onChange();
    } finally {
      setBusy(email, false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Add individual user
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="name@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUser()}
            className="flex-1"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <Button onClick={addUser} disabled={adding || !newEmail.trim()} className="gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-right px-4 py-2">Logins</th>
              <th className="text-left px-4 py-2">Last login</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.email} className={u.revokedAt ? "bg-red-50/30" : ""}>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-800">{u.email}</div>
                  {u.revokedAt && <div className="text-[10px] text-red-500 uppercase font-bold">Revoked</div>}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={u.role}
                    disabled={pending.has(u.email)}
                    onChange={(e) => patchUser(u.email, { role: e.target.value as Role })}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      u.source === "individual" ? "bg-[#1a3668] text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {u.source}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{u.loginCount}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-GB") : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.revokedAt ? (
                    <button
                      onClick={() => patchUser(u.email, { revoked: false })}
                      disabled={pending.has(u.email)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm(`Revoke access for ${u.email}?`)) patchUser(u.email, { revoked: true });
                      }}
                      disabled={pending.has(u.email)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Domains tab ────────────────────────────────────────────────────────────

function DomainsTab({ domains, onChange }: { domains: DomainRow[]; onChange: () => void }) {
  const [newDomain, setNewDomain] = useState("");
  const [newRole, setNewRole] = useState<Role>("USER");
  const [adding, setAdding] = useState(false);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim(), role: newRole }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Failed to add domain");
        return;
      }
      setNewDomain("");
      setNewRole("USER");
      onChange();
    } finally {
      setAdding(false);
    }
  };

  const removeDomain = async (domain: string) => {
    if (!confirm(`Remove @${domain} from the whitelist? Users who signed in via this domain will lose access.`)) return;
    await fetch(`/api/admin/domains/${encodeURIComponent(domain)}`, { method: "DELETE" });
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Whitelist a domain</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDomain()}
            className="flex-1"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <Button onClick={addDomain} disabled={adding || !newDomain.trim()} className="gap-1.5 bg-[#1a3668] hover:bg-[#12274d] text-white">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">Domain</th>
              <th className="text-left px-4 py-2">Role granted</th>
              <th className="text-left px-4 py-2">Added by</th>
              <th className="text-left px-4 py-2">Added</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {domains.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No domains whitelisted.
                </td>
              </tr>
            )}
            {domains.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2.5 font-medium text-gray-800">@{d.domain}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    {d.role}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{d.addedBy}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => removeDomain(d.domain)} className="text-xs text-red-500 hover:underline inline-flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Activity tab ───────────────────────────────────────────────────────────

function ActivityTab({ events }: { events: AuditRow[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-2">When</th>
            <th className="text-left px-4 py-2">Event</th>
            <th className="text-left px-4 py-2">Actor</th>
            <th className="text-left px-4 py-2">Target</th>
            <th className="text-left px-4 py-2">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No activity yet.
              </td>
            </tr>
          )}
          {events.map((e) => {
            const label = eventLabels[e.type] ?? e.type;
            return (
              <tr key={e.id}>
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                  {new Date(e.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${eventColors[e.type] ?? "bg-gray-100 text-gray-700"}`}>
                    {label}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">{e.actor}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{e.target ?? "—"}</td>
                <td className="px-4 py-2 text-[10px] text-gray-400 font-mono truncate max-w-xs">
                  {e.meta ? JSON.stringify(e.meta) : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const eventLabels: Record<string, string> = {
  SIGN_IN: "Sign in",
  USER_ADDED: "User added",
  USER_REVOKED: "User revoked",
  USER_RESTORED: "User restored",
  ROLE_CHANGED: "Role changed",
  DOMAIN_ADDED: "Domain added",
  DOMAIN_REMOVED: "Domain removed",
};

const eventColors: Record<string, string> = {
  SIGN_IN: "bg-blue-100 text-blue-700",
  USER_ADDED: "bg-green-100 text-green-700",
  USER_REVOKED: "bg-red-100 text-red-700",
  USER_RESTORED: "bg-green-100 text-green-700",
  ROLE_CHANGED: "bg-amber-100 text-amber-700",
  DOMAIN_ADDED: "bg-green-100 text-green-700",
  DOMAIN_REMOVED: "bg-red-100 text-red-700",
};

// ─── Usage tab ──────────────────────────────────────────────────────────────
// Layout: three totals at the top, then per-tool cards below with the
// specific actions the recruiter cares about (CV exports, anonymise,
// tailor to job spec). Each cell shows count/today/week.

const toolLabels: Record<string, string> = {
  "cv-generator": "CV Generator",
  "cv-scorer": "CV Scorer",
  "job-spec-creator": "Job Spec Creator",
  "interview-generator": "Interview Generator",
  "commute-calculator": "Commute Calculator",
};

const actionLabels: Record<string, string> = {
  "cv-import": "CV imports",
  "auto-rewrite": "Auto-rewrite",
  "tailor-job-spec": "Tailor to job spec",
  "anonymise": "Anonymise",
  "intro-email": "Intro email",
  "interview-questions": "Interview questions (bundled)",
  "pdf-export": "PDF exports",
  "docx-export": "DOCX exports",
  "score": "CVs scored",
  "generate-spec": "Specs generated",
  "generate-questions": "Question sets generated",
  "commute-lookup": "Commutes calculated",
};

// Which tools + actions to feature in the per-tool cards (in this order).
const TOOL_LAYOUT: Array<{ tool: string; actions: string[] }> = [
  {
    tool: "cv-generator",
    actions: ["pdf-export", "docx-export", "tailor-job-spec", "anonymise", "auto-rewrite", "intro-email", "interview-questions", "cv-import"],
  },
  { tool: "cv-scorer", actions: ["score"] },
  { tool: "job-spec-creator", actions: ["generate-spec"] },
  { tool: "interview-generator", actions: ["generate-questions"] },
  { tool: "commute-calculator", actions: ["commute-lookup"] },
];

function getCount(rows: UsageRow[] | undefined, tool: string, action: string): number {
  return rows?.find((r) => r.tool === tool && r.action === action)?.count ?? 0;
}

function UsageTab({ usage }: { usage: UsageStats | null }) {
  if (!usage) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        Loading usage stats…
      </div>
    );
  }

  const hasAnyData = usage.totals.allTime > 0;
  return (
    <div className="space-y-6">
      {/* Headline totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Actions today" value={usage.totals.today} />
        <StatTile label="Actions this week" value={usage.totals.thisWeek} />
        <StatTile label="Total actions all time" value={usage.totals.allTime} />
      </div>

      {!hasAnyData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
          No usage data yet. Actions taken across the tool suite start appearing here from now on.
        </div>
      )}

      {/* Per-tool cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TOOL_LAYOUT.map((row) => (
          <div key={row.tool} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-[#1a3668] tracking-tight">{toolLabels[row.tool]}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                <tr>
                  <th className="text-left px-4 py-1.5">Action</th>
                  <th className="text-right px-4 py-1.5 w-16">Today</th>
                  <th className="text-right px-4 py-1.5 w-16">7d</th>
                  <th className="text-right px-4 py-1.5 w-20">All-time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {row.actions.map((action) => {
                  const today = getCount(usage.today, row.tool, action);
                  const week = getCount(usage.thisWeek, row.tool, action);
                  const all = getCount(usage.allTime, row.tool, action);
                  return (
                    <tr key={action} className={all === 0 ? "opacity-40" : ""}>
                      <td className="px-4 py-2 text-xs text-gray-800">{actionLabels[action] ?? action}</td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums font-medium">{today}</td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums font-medium">{week}</td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums font-bold text-[#1a3668]">{all}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      {usage.topUsers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-[#1a3668] tracking-tight">Most active users this week</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {usage.topUsers.map((u, i) => (
                <tr key={u.email ?? i}>
                  <td className="px-4 py-2 w-8 text-[10px] font-bold text-gray-400 uppercase tabular-nums">#{i + 1}</td>
                  <td className="px-4 py-2 text-xs text-gray-800">{u.email ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-right tabular-nums font-bold text-[#1a3668] w-24">{u.count} actions</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Leads tab ──────────────────────────────────────────────────────────────
//
// Job Spec Creator enquiries. Leads are stored in the database at the moment
// the spec is generated, so this list is complete regardless of whether the
// notification email got through — and the per-row delivery badges show
// exactly which ones didn't.

function LeadsTab({ data, onChange }: { data: LeadsPayload | null; onChange: () => void }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/leads", { method: "POST" });
      const json = await res.json();
      setTestResult(
        json.status === "sent"
          ? `Test email accepted by Resend — check ${json.to}.`
          : `Test failed (${json.status}): ${json.error ?? "unknown error"}`
      );
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test request failed.");
    } finally {
      setTesting(false);
      onChange();
    }
  };

  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Email configuration health */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Lead email delivery
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Sending from <span className="font-mono">{data.config.from}</span> to{" "}
              <span className="font-mono">
                {data.config.notify.join(", ") || "(nobody — not configured)"}
              </span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={sendTest} disabled={testing} className="text-xs gap-1.5 shrink-0">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send test email
          </Button>
        </div>

        {data.config.problems.map((p) => (
          <div key={p} className="flex gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{p}</span>
          </div>
        ))}
        {data.config.problems.length === 0 && (
          <div className="flex gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Sender and recipients are configured.</span>
          </div>
        )}
        {!data.tableReady && (
          <div className="flex gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{data.error}</span>
          </div>
        )}
        {testResult && <p className="text-xs text-gray-600">{testResult}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatTile label="Leads captured" value={data.total} />
        <StatTile label="Notifications not delivered" value={data.undelivered} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2">When</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Company</th>
              <th className="text-left px-4 py-2">Notified</th>
              <th className="text-left px-4 py-2">Their copy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No leads captured yet.
                </td>
              </tr>
            )}
            {data.leads.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
                  {new Date(l.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-2 text-xs font-medium text-[#1a3668]">{l.name}</td>
                <td className="px-4 py-2 text-xs">
                  <a href={`mailto:${l.email}`} className="text-[#df2681] hover:underline">
                    {l.email}
                  </a>
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">{l.jobTitle ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[12rem]">
                  {l.companyUrl ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <DeliveryBadge status={l.notifyStatus} error={l.notifyError} />
                </td>
                <td className="px-4 py-2">
                  <DeliveryBadge status={l.copyStatus} error={l.copyError} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeliveryBadge({ status, error }: { status: string; error: string | null }) {
  const colors: Record<string, string> = {
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    skipped: "bg-gray-100 text-gray-600",
    pending: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      title={error ?? undefined}
      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}
