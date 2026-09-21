import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Upload, MapPin, Droplets } from "lucide-react";
import { supabase, logActivity } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useTanks, useTankSites, useWbsProgressMap, tankProgress, TANK_STATUS_OPTIONS } from "@/hooks/useTanks";
import { useWorkAreas } from "@/hooks/useProjects";

const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";

async function uploadImage(projectId: string, file: File): Promise<string | null> {
  const key = `${projectId}/tanks/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const up = await supabase.storage.from("project-photos").upload(key, file);
  if (up.error) { toast({ title: "Upload gagal", description: up.error.message, variant: "destructive" }); return null; }
  return supabase.storage.from("project-photos").getPublicUrl(key).data.publicUrl;
}

export function TankPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: sites = [] } = useTankSites(projectId);
  const { data: tanks = [] } = useTanks(projectId);
  const { data: areas = [] } = useWorkAreas(projectId);
  const wbsMap = useWbsProgressMap(projectId);
  const [newSite, setNewSite] = useState("");
  const [newTank, setNewTank] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["project_tanks", projectId] });
    qc.invalidateQueries({ queryKey: ["project_tank_sites", projectId] });
  };

  const addSite = async () => {
    if (!newSite.trim()) return;
    const { error } = await (supabase as any).from("project_tank_sites")
      .insert({ project_id: projectId, name: newSite.trim(), sort_order: sites.length });
    if (error) return toast({ title: "Gagal menambah lokasi", description: error.message, variant: "destructive" });
    await logActivity("tank_site", null, "create", `Menambah lokasi tangki ${newSite.trim()}`, projectId);
    setNewSite(""); refresh();
  };

  const saveSite = async (id: string, patch: any) => {
    const { error } = await (supabase as any).from("project_tank_sites").update(patch).eq("id", id);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    refresh();
  };

  const deleteSite = async (id: string, name: string) => {
    if (!confirm(`Hapus lokasi "${name}"?`)) return;
    const { error } = await (supabase as any).from("project_tank_sites").delete().eq("id", id);
    if (error) return toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    await logActivity("tank_site", id, "delete", `Menghapus lokasi tangki ${name}`, projectId);
    refresh();
  };

  const addTank = async () => {
    if (!newTank.trim()) return;
    const { error } = await (supabase as any).from("project_tanks").insert({
      project_id: projectId, tank_code: newTank.trim(), site_id: sites[0]?.id ?? null, sort_order: tanks.length,
    });
    if (error) return toast({ title: "Gagal menambah tangki", description: error.message, variant: "destructive" });
    await logActivity("tank", null, "create", `Menambah tangki ${newTank.trim()}`, projectId);
    setNewTank(""); refresh();
  };

  const saveTank = async (id: string, patch: any) => {
    const { error } = await (supabase as any).from("project_tanks").update(patch).eq("id", id);
    if (error) return toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    refresh();
  };

  const deleteTank = async (id: string, code: string) => {
    if (!confirm(`Hapus tangki "${code}"?`)) return;
    const { error } = await (supabase as any).from("project_tanks").delete().eq("id", id);
    if (error) return toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    await logActivity("tank", id, "delete", `Menghapus tangki ${code}`, projectId);
    refresh();
  };

  return (
    <div className="space-y-5">
      {/* Lokasi / foto udara */}
      <div className="glass-card rounded-lg shadow-card p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-primary" /> Lokasi Terminal & Foto Udara</h3>
        <div className="flex gap-2 mb-3">
          <input value={newSite} onChange={e => setNewSite(e.target.value)} placeholder="Nama lokasi (mis. Tanjung Wangi)" className={inputCls} />
          <button onClick={addSite} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium whitespace-nowrap"><Plus className="h-3.5 w-3.5" /> Tambah</button>
        </div>
        <div className="space-y-2">
          {sites.map(s => (
            <div key={s.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto_auto] gap-2 items-end border border-border rounded p-2">
              <div><label className={labelCls}>Nama Lokasi</label>
                <input defaultValue={s.name} onBlur={e => e.target.value !== s.name && saveSite(s.id, { name: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>URL Foto Udara</label>
                <input defaultValue={s.image_url ?? ""} onBlur={e => e.target.value !== (s.image_url ?? "") && saveSite(s.id, { image_url: e.target.value || null })} className={inputCls} placeholder="https://… atau upload" /></div>
              <label className="flex items-center gap-1 px-2.5 py-1.5 bg-muted border border-border rounded text-xs cursor-pointer whitespace-nowrap">
                <Upload className="h-3.5 w-3.5" /> {busy ? "…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setBusy(true); const url = await uploadImage(projectId, f); setBusy(false);
                  if (url) saveSite(s.id, { image_url: url });
                }} />
              </label>
              <button onClick={() => deleteSite(s.id, s.name)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {sites.length === 0 && <p className="text-xs text-muted-foreground">Belum ada lokasi.</p>}
        </div>
      </div>

      {/* Tangki */}
      <div className="glass-card rounded-lg shadow-card p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Droplets className="h-4 w-4 text-primary" /> Data Tangki (Halaman BoD)</h3>
        <div className="flex gap-2 mb-3">
          <input value={newTank} onChange={e => setNewTank(e.target.value)} placeholder="Kode tangki (mis. T-43)" className={inputCls} />
          <button onClick={addTank} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium whitespace-nowrap"><Plus className="h-3.5 w-3.5" /> Tambah</button>
        </div>

        <div className="space-y-3">
          {tanks.map(t => (
            <div key={t.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div><label className={labelCls}>Kode</label>
                  <input defaultValue={t.tank_code} onBlur={e => e.target.value !== t.tank_code && saveTank(t.id, { tank_code: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Produk</label>
                  <input defaultValue={t.product ?? ""} onBlur={e => saveTank(t.id, { product: e.target.value || null })} className={inputCls} /></div>
                <div><label className={labelCls}>Kapasitas (KL)</label>
                  <input type="number" defaultValue={t.capacity_kl ?? ""} onBlur={e => saveTank(t.id, { capacity_kl: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} /></div>
                <div><label className={labelCls}>Status</label>
                  <select defaultValue={t.status} onChange={e => saveTank(t.id, { status: e.target.value })} className={inputCls}>
                    {TANK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select></div>
                <div><label className={labelCls}>Target Finish</label>
                  <input type="date" defaultValue={t.finish_date ?? ""} onBlur={e => saveTank(t.id, { finish_date: e.target.value || null })} className={inputCls} /></div>
                <div><label className={labelCls}>Lokasi</label>
                  <select defaultValue={t.site_id ?? ""} onChange={e => saveTank(t.id, { site_id: e.target.value || null })} className={inputCls}>
                    <option value="">—</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="md:col-span-2"><label className={labelCls}>Sumber Progress (WBS)</label>
                  <select defaultValue={t.work_area_id ?? ""} onChange={e => saveTank(t.id, { work_area_id: e.target.value || null })} className={inputCls}>
                    <option value="">— tidak terkait WBS —</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                  </select></div>
                <div><label className={labelCls}>Progress Manual (%)</label>
                  <input type="number" step="0.01" defaultValue={t.manual_progress ?? ""} placeholder="kosong = ikut WBS"
                    onBlur={e => saveTank(t.id, { manual_progress: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} /></div>
                <div><label className={labelCls}>Posisi X (%)</label>
                  <input type="number" defaultValue={t.map_x} onBlur={e => saveTank(t.id, { map_x: Number(e.target.value) || 0 })} className={inputCls} /></div>
                <div><label className={labelCls}>Posisi Y (%)</label>
                  <input type="number" defaultValue={t.map_y} onBlur={e => saveTank(t.id, { map_y: Number(e.target.value) || 0 })} className={inputCls} /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_auto] gap-2 items-end">
                <div><label className={labelCls}>URL Foto Tangki</label>
                  <input defaultValue={t.photo_url ?? ""} onBlur={e => saveTank(t.id, { photo_url: e.target.value || null })} className={inputCls} placeholder="https://… atau upload" /></div>
                <label className="flex items-center gap-1 px-2.5 py-1.5 bg-muted border border-border rounded text-xs cursor-pointer whitespace-nowrap">
                  <Upload className="h-3.5 w-3.5" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await uploadImage(projectId, f);
                    if (url) saveTank(t.id, { photo_url: url });
                  }} />
                </label>
              </div>

              <div><label className={labelCls}>Narasi Pekerjaan</label>
                <textarea defaultValue={t.description ?? ""} rows={2} onBlur={e => saveTank(t.id, { description: e.target.value || null })} className={inputCls} /></div>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  Progress tampil di halaman BoD: <b className="text-primary font-mono-data">{tankProgress(t, wbsMap).toFixed(2).replace(".", ",")}%</b>
                  {t.manual_progress == null ? " (otomatis dari WBS)" : " (manual)"}
                </span>
                <button onClick={() => deleteTank(t.id, t.tank_code)} className="flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
              </div>
            </div>
          ))}
          {tanks.length === 0 && <p className="text-xs text-muted-foreground">Belum ada tangki untuk proyek ini.</p>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1"><Save className="h-3 w-3" /> Perubahan tersimpan otomatis saat keluar dari kolom.</p>
      </div>
    </div>
  );
}
