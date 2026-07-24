import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, Trash2, Calendar, MapPin, Edit3, Save, X } from "lucide-react";
import { supabase, logActivity, EPCC_CATEGORIES } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";

function toWeekLabel(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `Week ${week} - ${d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
}

export function PhotoUploader({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<FileList | null>(null);
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0,10));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("construction");
  const [location, setLocation] = useState("");
  const [weekLabel, setWeekLabel] = useState(toWeekLabel(new Date().toISOString().slice(0,10)));
  const [customWeek, setCustomWeek] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const [filterCat, setFilterCat] = useState("all");
  const [filterWeek, setFilterWeek] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("project_photos").select("*").eq("project_id", projectId).order("photo_date", { ascending: false }).order("uploaded_at", { ascending: false });
    setPhotos(data || []);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);
  useEffect(() => { if (!customWeek) setWeekLabel(toWeekLabel(photoDate)); }, [photoDate, customWeek]);

  const handleUpload = async () => {
    if (!files || files.length === 0) { toast({ title: "Pilih file dulu", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const rows: any[] = [];
      for (const file of Array.from(files)) {
        const key = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const up = await supabase.storage.from("project-photos").upload(key, file);
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("project-photos").getPublicUrl(key);
        rows.push({
          project_id: projectId, photo_url: pub.publicUrl,
          caption: title || description || "",
          week_label: weekLabel,
          title, description, photo_date: photoDate,
          activity_category: category, location,
        });
      }
      const { error } = await supabase.from("project_photos").insert(rows as any);
      if (error) throw error;
      await logActivity(supabase, "photo", "create", `Uploaded ${rows.length} photo(s) for ${weekLabel}`, projectId);
      qc.invalidateQueries({ queryKey: ["project_photos"] });
      toast({ title: "✅ Uploaded", description: `${rows.length} foto berhasil diupload` });
      setFiles(null); setTitle(""); setDescription(""); setLocation("");
      (document.getElementById("photo-file-input") as HTMLInputElement).value = "";
      load();
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const del = async (p: any) => {
    if (!confirm("Hapus foto ini?")) return;
    const m = (p.photo_url || "").match(/project-photos\/(.+)$/);
    if (m) await supabase.storage.from("project-photos").remove([m[1]]);
    await supabase.from("project_photos").delete().eq("id", p.id);
    await logActivity(supabase, "photo", "delete", `Deleted photo: ${p.title || p.caption || 'untitled'}`, projectId, p.id);
    load();
  };

  const saveEdit = async (id: string) => {
    const v = edit;
    await supabase.from("project_photos").update({
      title: v.title || "", description: v.description || "", photo_date: v.photo_date,
      activity_category: v.activity_category, location: v.location || "",
      week_label: v.week_label, caption: v.title || v.description || "",
    } as any).eq("id", id);
    await logActivity(supabase, "photo", "update", `Photo updated: ${v.title || 'untitled'}`, projectId, id);
    setEditingId(null); load(); toast({ title: "✅ Saved" });
  };

  const filtered = photos.filter(p =>
    (filterCat === "all" || (p.activity_category || 'construction') === filterCat) &&
    (filterWeek === "all" || p.week_label === filterWeek) &&
    (!search || [p.title, p.description, p.location, p.caption].some(x => (x||"").toLowerCase().includes(search.toLowerCase())))
  );

  const grouped = filtered.reduce((acc: Record<string, any[]>, p) => {
    const k = p.week_label || "Uncategorized";
    (acc[k] ||= []).push(p); return acc;
  }, {});
  const weekOptions = Array.from(new Set(photos.map(p => p.week_label).filter(Boolean)));

  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Weekly Progress Photos</h3>

      <div className="bg-muted/30 rounded-lg p-4 border border-border/50 mb-3 max-w-2xl">
        <p className="text-[10px] font-semibold text-foreground mb-3 uppercase tracking-wide">Upload Foto Baru</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Photo Date*</label>
            <input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Activity Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Week Label {!customWeek && "(auto)"}</label>
            <div className="flex gap-1">
              <input value={weekLabel} onChange={e => { setCustomWeek(true); setWeekLabel(e.target.value); }} className={inputCls} />
              {customWeek && <button onClick={() => setCustomWeek(false)} className="px-2 text-[10px] bg-muted rounded border border-border whitespace-nowrap">auto</button>}
            </div>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Judul foto (mis. Instalasi Tank 101)" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Deskripsi singkat aktivitas" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Location (opsional)</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} placeholder="mis. Tank Area B" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Files (bisa multiple)</label>
            <input id="photo-file-input" type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className={inputCls + " file:mr-2 file:bg-primary file:text-primary-foreground file:border-0 file:rounded file:px-2 file:py-0.5 file:text-[10px]"} />
          </div>
        </div>
        <button onClick={handleUpload} disabled={uploading} className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 hover:bg-primary/90">
          <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading..." : `Upload ${files?.length || 0} file(s)`}
        </button>
      </div>



      <div className="bg-muted/20 border border-border/50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold"><Camera className="h-3 w-3" /> Filter & Search</div>
          <span className="text-[10px] text-muted-foreground">{filtered.length}/{photos.length} foto</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div><label className={labelCls}>Category</label>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={inputCls}>
              <option value="all">All Categories</option>
              {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Week</label>
            <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} className={inputCls}>
              <option value="all">All Weeks</option>
              {weekOptions.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Title / description / location..." className={inputCls} />
          </div>
        </div>
      </div>


      {Object.keys(grouped).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Belum ada foto yang cocok filter.</p>}

      {(Object.entries(grouped) as [string, any[]][]).map(([week, list]) => (
        <div key={week} className="mb-3">
          <h4 className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" /> {week} <span className="text-muted-foreground font-normal">({list.length} foto)</span></h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {list.map(p => {
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="rounded-lg overflow-hidden border border-border bg-card">
                  <div className="relative group">
                    <img src={p.photo_url} alt={p.title || p.caption} className="w-full h-28 object-cover" />
                    {!isEditing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        <button onClick={() => { setEditingId(p.id); setEdit(p); }} className="p-1.5 bg-primary text-primary-foreground rounded-full"><Edit3 className="h-3 w-3" /></button>
                        <button onClick={() => del(p)} className="p-1.5 bg-destructive text-destructive-foreground rounded-full"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="p-2 space-y-1">
                      <input value={edit.title || ""} onChange={e => setEdit({...edit, title: e.target.value})} className={inputCls} placeholder="Title" />
                      <input value={edit.description || ""} onChange={e => setEdit({...edit, description: e.target.value})} className={inputCls} placeholder="Description" />
                      <div className="grid grid-cols-2 gap-1">
                        <input type="date" value={edit.photo_date || ""} onChange={e => setEdit({...edit, photo_date: e.target.value})} className={inputCls} />
                        <select value={edit.activity_category || "construction"} onChange={e => setEdit({...edit, activity_category: e.target.value})} className={inputCls}>
                          {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <input value={edit.location || ""} onChange={e => setEdit({...edit, location: e.target.value})} className={inputCls} placeholder="Location" />
                      <input value={edit.week_label || ""} onChange={e => setEdit({...edit, week_label: e.target.value})} className={inputCls} placeholder="Week label" />
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(p.id)} className="flex-1 px-2 py-1 bg-success text-success-foreground rounded text-[10px]"><Save className="h-3 w-3 inline mr-1" />Save</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-muted rounded text-[10px] border border-border"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-0.5">
                      {p.title && <p className="text-[11px] font-semibold text-foreground truncate">{p.title}</p>}
                      {p.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{p.description}</p>}
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-0.5">
                        <span className="capitalize">{p.activity_category || 'construction'}</span>
                        {p.photo_date && <span>{new Date(p.photo_date).toLocaleDateString('id-ID')}</span>}
                      </div>
                      {p.location && <p className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{p.location}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
