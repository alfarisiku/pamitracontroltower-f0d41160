import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { useAuth, SYSTEM_EMAILS } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Users, Shield, CheckCircle2, XCircle, Edit3, UserX, FolderKanban,
  Search, RefreshCw, Lock
} from "lucide-react";

interface UserRow {
  user_id: string;
  display_name: string;
  status: string;
  avatar_url: string | null;
  assigned_project_id: string | null;
  created_at: string;
  email?: string;
  role?: string;
  assignedProjectIds?: string[];
}

const AccountManager = () => {
  const { data: projects = [] } = useProjects();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editProjects, setEditProjects] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: assignments }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("user_project_assignments").select("*"),
    ]);

    if (profiles) {
      const mapped = profiles.map((p: any) => {
        const r = roles?.find((r: any) => r.user_id === p.user_id);
        const userAssignments = assignments?.filter((a: any) => a.user_id === p.user_id).map((a: any) => a.project_id) || [];
        return { ...p, role: r?.role || "unassigned", assignedProjectIds: userAssignments };
      });
      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const isSystemUser = (userId: string) => {
    const u = users.find(u => u.user_id === userId);
    return u?.display_name === "Super Admin" || u?.display_name === "Director" || 
           u?.role === "admin" && u?.display_name?.includes("Admin") ||
           u?.role === "management" && u?.display_name === "Director";
  };

  const handleApproveAndAssign = (userId: string) => {
    const u = users.find(u => u.user_id === userId);
    setEditingUser(userId);
    setEditRole("team");
    setEditProjects(u?.assignedProjectIds || []);
  };

  const handleReject = async (userId: string) => {
    if (isSystemUser(userId)) { toast({ title: "Error", description: "Akun sistem tidak bisa diubah.", variant: "destructive" }); return; }
    await supabase.from("profiles").update({ status: "disabled" }).eq("user_id", userId);
    toast({ title: "User Rejected" });
    fetchUsers();
  };

  const handleDisable = async (userId: string) => {
    if (isSystemUser(userId)) { toast({ title: "Error", description: "Akun sistem tidak bisa dinonaktifkan.", variant: "destructive" }); return; }
    await supabase.from("profiles").update({ status: "disabled" }).eq("user_id", userId);
    toast({ title: "User Disabled" });
    fetchUsers();
  };

  const handleSaveRole = async (userId: string) => {
    if (isSystemUser(userId)) { toast({ title: "Error", description: "Akun sistem tidak bisa diubah.", variant: "destructive" }); return; }

    // Validate: team role must have at least one project
    if (editRole === "team" && editProjects.length === 0) {
      toast({ title: "Error", description: "Project Team harus memiliki minimal 1 proyek yang di-assign.", variant: "destructive" });
      return;
    }

    // Upsert role
    if (editRole && editRole !== "unassigned") {
      const { data: existing } = await supabase.from("user_roles").select("id").eq("user_id", userId).single();
      if (existing) {
        await supabase.from("user_roles").update({ role: editRole as any }).eq("user_id", userId);
      } else {
        await supabase.from("user_roles").insert({ user_id: userId, role: editRole as any });
      }
    }

    // Update project assignments
    // Delete old assignments
    await supabase.from("user_project_assignments").delete().eq("user_id", userId);
    // Insert new assignments
    if (editProjects.length > 0) {
      await supabase.from("user_project_assignments").insert(
        editProjects.map(pid => ({ user_id: userId, project_id: pid }))
      );
    }

    // Also update legacy field
    const mainProject = editProjects.length > 0 ? editProjects[0] : null;
    await supabase.from("profiles").update({ assigned_project_id: mainProject, status: "active" }).eq("user_id", userId);

    toast({ title: "User Updated", description: "Role dan proyek berhasil diperbarui." });
    setEditingUser(null);
    fetchUsers();
  };

  const toggleProject = (projectId: string) => {
    setEditProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const filtered = users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(search.toLowerCase())
  );

  const pendingUsers = users.filter(u => u.status === "pending");

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: "bg-success/15", text: "text-success", label: "Active" },
      pending: { bg: "bg-accent/15", text: "text-accent", label: "Pending" },
      disabled: { bg: "bg-destructive/15", text: "text-destructive", label: "Disabled" },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const roleBadge = (role: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      admin: { bg: "bg-primary/15", text: "text-primary" },
      management: { bg: "bg-info/15", text: "text-info" },
      team: { bg: "bg-success/15", text: "text-success" },
      client: { bg: "bg-accent/15", text: "text-accent" },
      unassigned: { bg: "bg-muted", text: "text-muted-foreground" },
    };
    const s = map[role] || map.unassigned;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${s.bg} ${s.text}`}>{role}</span>;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <DashboardHeader />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Account Manager
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Kelola akun pengguna, role, dan akses proyek</p>
          </div>
          <button onClick={fetchUsers} className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
            { label: "Active", value: users.filter(u => u.status === "active").length, icon: CheckCircle2, color: "text-success" },
            { label: "Pending", value: pendingUsers.length, icon: Shield, color: "text-accent" },
            { label: "Disabled", value: users.filter(u => u.status === "disabled").length, icon: UserX, color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Cari user..." />
        </div>

        {/* Pending users */}
        {pendingUsers.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-accent mb-2">⏳ Menunggu Persetujuan ({pendingUsers.length})</h3>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div key={u.user_id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">Registered {new Date(u.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveAndAssign(u.user_id)}
                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                      <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Approve & Assign
                    </button>
                    <button onClick={() => handleReject(u.user_id)}
                      className="px-3 py-1.5 text-xs bg-destructive/15 text-destructive rounded-lg hover:bg-destructive/25">
                      <XCircle className="h-3.5 w-3.5 inline mr-1" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Assigned Projects</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const userProjects = (u.assignedProjectIds || []).map(pid => projects.find(p => p.id === pid)).filter(Boolean);
                const isSys = isSystemUser(u.user_id);
                return (
                  <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                          {u.display_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-1.5">
                            {u.display_name}
                            {isSys && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </p>
                          {isSys && <p className="text-[9px] text-muted-foreground">System Account</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3">{roleBadge(u.role || "unassigned")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.role === "admin" || u.role === "management" ? (
                          <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">All Projects</span>
                        ) : userProjects.length > 0 ? (
                          userProjects.map(p => (
                            <span key={p!.id} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-foreground">
                              {p!.project_code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isSys ? (
                          <span className="text-[10px] text-muted-foreground px-2">Protected</span>
                        ) : (
                          <>
                            {u.status === "pending" && (
                              <button onClick={() => handleApproveAndAssign(u.user_id)}
                                className="p-1.5 rounded hover:bg-success/15 text-success" title="Approve & Assign">
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => { setEditingUser(u.user_id); setEditRole(u.role || "team"); setEditProjects(u.assignedProjectIds || []); }}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Edit">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {u.status !== "disabled" && (
                              <button onClick={() => handleDisable(u.user_id)}
                                className="p-1.5 rounded hover:bg-destructive/15 text-destructive" title="Disable">
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Edit modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-foreground">Edit User</h3>
              <p className="text-sm text-muted-foreground">
                {users.find(u => u.user_id === editingUser)?.display_name}
              </p>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground">
                  <option value="team">Project Team</option>
                  <option value="management">Management / Director</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client / War Room</option>
                </select>
              </div>

              {(editRole === "team") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Assign Projects <span className="text-destructive">*</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground mb-2">Pilih satu atau lebih proyek (multi-select)</p>
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer">
                        <input type="checkbox" checked={editProjects.includes(p.id)} onChange={() => toggleProject(p.id)}
                          className="rounded border-border text-primary focus:ring-primary" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{p.project_code}</p>
                          <p className="text-[10px] text-muted-foreground">{p.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {editProjects.length === 0 && (
                    <p className="text-[10px] text-destructive mt-1">Minimal 1 proyek harus dipilih</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => handleSaveRole(editingUser)}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                  Save
                </button>
                <button onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AccountManager;
