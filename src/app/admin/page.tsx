"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Globe, Activity, ArrowLeft, Plus, Loader2, Shield, RefreshCw, X } from "lucide-react";
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

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "domains" | "activity">("users");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const [s, u, d, a] = await Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/domains").then((r) => r.json()),
      fetch("/api/admin/activity").then((r) => r.json()),
    ]);
    setStats(s);
    setUsers(u.users ?? []);
    setDomains(d.domains ?? []);
    setActivity(a.events ?? []);
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
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")} icon={Activity}>
            Activity
          </TabButton>
        </div>

        {tab === "users" && <UsersTab users={users} onChange={refreshAll} />}
        {tab === "domains" && <DomainsTab domains={domains} onChange={refreshAll} />}
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
