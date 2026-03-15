"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { UserRole } from "@/lib/types";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  sales: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  processing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  management: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  sales: "Sales",
  processing: "Processing",
  management: "Management",
};

export default function AdminUsersPage() {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  // Create form
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("sales");
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && hasRole("superadmin")) fetchUsers();
  }, [user, hasRole, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formEmail,
        password: formPassword,
        fullName: formName,
        role: formRole,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to create user");
    } else {
      toast.success(`User ${formEmail} created`);
      setShowCreate(false);
      setFormEmail("");
      setFormPassword("");
      setFormName("");
      setFormRole("sales");
      fetchUsers();
    }
    setCreating(false);
  };

  const handleToggleActive = async (u: UserRow) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.is_active }),
    });
    if (res.ok) {
      toast.success(`User ${u.is_active ? "deactivated" : "activated"}`);
      fetchUsers();
    }
  };

  const handleUpdateRole = async (u: UserRow, newRole: UserRole) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
      setEditUser(null);
      fetchUsers();
    }
  };

  if (!hasRole("superadmin")) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">User Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">{users.length} users</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Create User
          </Button>
        </div>

        {/* User table */}
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Joined</th>
                    <th className="px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/20 last:border-0 transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {u.full_name
                              ? u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                              : u.email[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{u.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn("text-[10px] font-medium border-0", ROLE_COLORS[u.role] || "")}>
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(u.created_at).toLocaleDateString("en-GB")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditUser(u)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(u)}
                              className={cn(
                                "h-7 px-2 text-xs",
                                u.is_active
                                  ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                              )}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Create User</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                New users will be able to sign in immediately.
              </p>
              <form onSubmit={handleCreate} className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} required className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                  <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required minLength={6} className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="sales">Sales</option>
                    <option value="processing">Processing</option>
                    <option value="management">Management</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={creating} className="gap-1.5">
                    {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Create
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Role Modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Edit User Role</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {editUser.full_name} ({editUser.email})
              </p>
              <div className="mt-4 space-y-2">
                {(["sales", "processing", "management", "superadmin"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleUpdateRole(editUser, r)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                      editUser.role === r
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border/40 hover:bg-muted/30"
                    )}
                  >
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left">{ROLE_LABELS[r]}</span>
                    {editUser.role === r && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setEditUser(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
