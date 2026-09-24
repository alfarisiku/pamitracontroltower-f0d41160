import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { MENU_DEFS, DEFAULT_LEVEL2_MENUS, DATA_ENTRY_TABS, DE_PREFIX } from "@/lib/menus";
import {
  Users, Shield, CheckCircle2, Edit3, UserX, UserCheck, Trash2,
  Search, RefreshCw, Lock, KeyRound, Plus, Mail,
} from "lucide-react";

interface UserRow {
  user_id: string;
  display_name: string;
  status: string;
  created_at: string;
  email: string;
  isAdmin: boolean;
  assignedProjectIds: string[];
  allowedMenus: string[] | null;
}

const AccountManager = () => {
  const { data: projects = [] } = useProjects();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editProjects, setEditProjects] = useState<string[]>([]);
  const [editMenus, setEditMenus] = useState<string[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "" });
  const [newProjects, setNewProjects] = useState<string[]>([]);

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error) {
      // Ambil pesan asli dari server bila tersedia
      let detail = error.message;
      const res = (error as any)?.context;
      if (res && typeof res.json === "function") {
        try {
          const j = await res.json();
          if (j?.error) detail = j.error;
        } catch { /* noop */ }
      }
      throw new Error(detail);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: roles }, { data: assignments }, authRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("user_project_assignments").select("*"),
        callAdmin({ action: "list" }).catch(() => ({ users: [] })),
      ]);

      const emails: Record<string, string> = {};
      for (const u of (authRes?.users ?? [])) emails[u.id] = u.email ?? "";

      const mapped: UserRow[] = (profiles ?? []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        status: p.status,
        created_at: p.created_at,
        email: emails[p.user_id] ?? "—",
        isAdmin: (roles ?? []).some((r: any) => r.user_id === p.user_id && r.role === "admin"),
        assignedProjectIds: (assignments ?? []).filter((a: any) => a.user_id === p.user_id).map((a: any) => a.project_id),
        allowedMenus: p.allowed_menus ?? null,
      }));
      setUsers(mapped);
    } catch (e: any) {
      toast({ title: "❌ Gagal memuat akun", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); /* eslint-disable-next-line */ }, []);

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setEditEmail(u.email === "—" ? "" : u.email);
    setEditPassword("");
    setEditProjects(u.assignedProjectIds);
    setEditMenus(u.allowedMenus && u.allowedMenus.length > 0 ? u.allowedMenus : DEFAULT_LEVEL2_MENUS);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    if (editPassword && editPassword.length < 6) {
      toast({ title: "Kata sandi terlalu pendek", description: "Minimal 6 karakter.", variant: "destructive" });
      return;
    }
    if (!editingUser.isAdmin && editProjects.length === 0) {
      toast({ title: "Proyek belum dipilih", description: "Pilih minimal 1 proyek agar akun bisa mengakses data.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if ((editEmail && editEmail !== editingUser.email) || editPassword) {
        await callAdmin({
          action: "update_credentials",
          user_id: editingUser.user_id,
          email: editEmail && editEmail !== editingUser.email ? editEmail : undefined,
          password: editPassword || undefined,
        });
      }
      if (!editingUser.isAdmin) {
        await callAdmin({ action: "set_projects", user_id: editingUser.user_id, project_ids: editProjects });
        await callAdmin({ action: "set_menus", user_id: editingUser.user_id, menus: editMenus });
      }
      toast({ title: "✅ Tersimpan", description: "Akun diperbarui." });
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "❌ Gagal", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const setStatus = async (u: UserRow, status: "active" | "disabled") => {
    setBusy(true);
    try {
      await callAdmin({ action: "set_status", user_id: u.user_id, status });
      toast({ title: status === "active" ? "✅ Akun diaktifkan" : "🚫 Akun dinonaktifkan" });
      fetchUsers();
    } catch (e: any) {
      toast({ title: "❌ Gagal", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Hapus akun "${u.display_name}" (${u.email}) secara permanen?`)) return;
    setBusy(true);
    try {
      await callAdmin({ action: "delete", user_id: u.user_id });
      toast({ title: "🗑️ Akun dihapus" });
      fetchUsers();
    } catch (e: any) {
      toast({ title: "❌ Gagal", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: "Lengkapi data", description: "Email dan password wajib diisi.", variant: "destructive" });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: "Kata sandi terlalu pendek", description: "Minimal 6 karakter.", variant: "destructive" });
      return;
    }
    if (newProjects.length === 0) {
      toast({ title: "Proyek belum dipilih", description: "Pilih minimal 1 proyek.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await callAdmin({ action: "create", ...newUser, project_ids: newProjects });
      toast({ title: "✅ Akun dibuat" });
      setShowCreate(false);
      setNewUser({ email: "", password: "", display_name: "" });
      setNewProjects([]);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "❌ Gagal", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const filtered = useMemo(() => users.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: "bg-success/15", text: "text-success", label: "Aktif" },
      pending: { bg: "bg-accent/15", text: "text-accent", label: "Menunggu" },
      disabled: { bg: "bg-destructive/15", text: "text-destructive", label: "Nonaktif" },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const projectPicker = (selected: string[], setSelected: (v: string[]) => void) => (
    <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
      {projects.map(p => (
        <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer">
          <input type="checkbox" checked={selected.includes(p.id)}
            onChange={() => setSelected(selected.includes(p.id) ? selected.filter(id => id !== p.id) : [...selected, p.id])}
            className="rounded border-border text-primary focus:ring-primary" />
          <div>
            <p className="text-xs font-medium text-foreground">{p.project_code}</p>
            <p className="text-[10px] text-muted-foreground">{p.name}</p>
          </div>
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <DashboardHeader />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Pengaturan Akun
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Kelola email, kata sandi, status, dan akses proyek setiap akun</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Akun Baru
            </button>
            <button onClick={fetchUsers} className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Akun", value: users.length, icon: Users, color: "text-primary" },
            { label: "Aktif", value: users.filter(u => u.status === "active").length, icon: CheckCircle2, color: "text-success" },
            { label: "Menunggu", value: users.filter(u => u.status === "pending").length, icon: Shield, color: "text-accent" },
            { label: "Nonaktif", value: users.filter(u => u.status === "disabled").length, icon: UserX, color: "text-destructive" },
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
            placeholder="Cari nama atau email..." />
        </div>

        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Memuat akun…</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Akun</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Akses Proyek</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const userProjects = u.assignedProjectIds.map(pid => projects.find(p => p.id === pid)).filter(Boolean);
                const isSelf = currentUser?.id === u.user_id;
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
                            {u.isAdmin && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </p>
                          {u.isAdmin && <p className="text-[9px] text-muted-foreground">Administrator — akses semua proyek</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.isAdmin ? (
                          <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">Semua Proyek</span>
                        ) : userProjects.length > 0 ? (
                          userProjects.map(p => (
                            <span key={p!.id} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-foreground">{p!.project_code}</span>
                          ))
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-warning/15 text-warning rounded-full">Belum ada proyek</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} disabled={busy}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Ubah email / kata sandi / proyek">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {u.status === "disabled" ? (
                          <button onClick={() => setStatus(u, "active")} disabled={busy}
                            className="p-1.5 rounded hover:bg-success/15 text-success" title="Aktifkan kembali">
                            <UserCheck className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => setStatus(u, "disabled")} disabled={busy || isSelf}
                            className="p-1.5 rounded hover:bg-destructive/15 text-destructive disabled:opacity-30" title="Nonaktifkan">
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => deleteUser(u)} disabled={busy || isSelf}
                          className="p-1.5 rounded hover:bg-destructive/15 text-destructive disabled:opacity-30" title="Hapus akun">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {/* Edit modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="text-lg font-bold text-foreground">Ubah Akun</h3>
                <p className="text-sm text-muted-foreground">{editingUser.display_name}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</label>
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Kata Sandi Baru</label>
                <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah"
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground" />
                <p className="text-[10px] text-muted-foreground mt-1">Kata sandi lama tersimpan terenkripsi dan tidak bisa dilihat siapa pun — hanya bisa diganti.</p>
              </div>

              {!editingUser.isAdmin && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Akses Proyek <span className="text-destructive">*</span></label>
                  {projectPicker(editProjects, setEditProjects)}
                  {editProjects.length === 0 && <p className="text-[10px] text-destructive mt-1">Minimal 1 proyek harus dipilih</p>}
                </div>
              )}

              {!editingUser.isAdmin && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Menu yang Boleh Diakses</label>
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {MENU_DEFS.map(m => (
                      <label key={m.path} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                        <input type="checkbox" checked={editMenus.includes(m.path)}
                          onChange={() => setEditMenus(editMenus.includes(m.path) ? editMenus.filter(x => x !== m.path) : [...editMenus, m.path])}
                          className="rounded border-border text-primary focus:ring-primary" />
                        <span className="text-xs text-foreground">{m.label}</span>
                      </label>
                    ))}
                  </div>
                  {editMenus.includes("/data-entry") && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bagian Data Entry yang Boleh Diakses</label>
                      <div className="grid grid-cols-2 gap-1 border border-border rounded-lg p-2">
                        {DATA_ENTRY_TABS.map(t => {
                          const v = DE_PREFIX + t.key;
                          return (
                            <label key={v} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/30 cursor-pointer rounded">
                              <input type="checkbox" checked={editMenus.includes(v)}
                                onChange={() => setEditMenus(editMenus.includes(v) ? editMenus.filter(x => x !== v) : [...editMenus, v])}
                                className="rounded border-border text-primary focus:ring-primary" />
                              <span className="text-xs text-foreground">{t.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Tidak dicentang sama sekali = semua bagian Data Entry boleh diakses.</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">Kosongkan semua untuk memakai menu bawaan (Project Summary, Data Entry, Activity Log).</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={saveUser} disabled={busy}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {busy ? "Menyimpan…" : "Simpan"}
                </button>
                <button onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">Batal</button>
              </div>
            </div>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-foreground">Akun Baru</h3>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nama</label>
                <input value={newUser.display_name} onChange={e => setNewUser({ ...newUser, display_name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email *</label>
                <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Kata Sandi *</label>
                <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Akses Proyek *</label>
                {projectPicker(newProjects, setNewProjects)}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={createUser} disabled={busy}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {busy ? "Membuat…" : "Buat Akun"}
                </button>
                <button onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">Batal</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AccountManager;
