import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Trash2, ChevronUp, ChevronDown, Save, X, Edit3, FolderPlus } from "lucide-react";
import { supabase, logActivity, EPCC_CATEGORIES } from "@/lib/supabase";
import { useWorkAreas, useWorkItems } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

const inputCls = "px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const fmtD = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "-";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";
const r1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

/** Bar ringkas: total bobot terpakai vs 100% + tombol bagi rata */
function WeightMeter({ total, count, onEven, label }: { total: number; count: number; onEven: () => void; label: string }) {
  const remain = r1(100 - total);
  const ok = Math.abs(remain) < 0.05;
  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${ok ? "bg-success" : total > 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, Math.max(0, total))}%` }} />
      </div>
      <span className={`font-medium ${ok ? "text-success" : total > 100 ? "text-destructive" : "text-warning"}`}>
        {r1(total)}% {ok ? "✓ pas" : total > 100 ? `(lebih ${r1(total - 100)}%)` : `(sisa ${remain}%)`}
      </span>
      {count > 0 && (
        <button onClick={onEven} className="px-1.5 py-0.5 rounded border border-border bg-card hover:bg-muted text-muted-foreground">Bagi rata</button>
      )}
    </div>
  );
}

export function WBSCrudPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: areas = [] } = useWorkAreas(projectId || undefined);
  const areaIds = areas.map(a => a.id);
  const { data: items = [] } = useWorkItems(areaIds);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [newAreaOpen, setNewAreaOpen] = useState(false);
  const [newArea, setNewArea] = useState({ code: "", name: "", weight: 0, epcc_category: "construction" });
  const areaTotal = areas.reduce((s2, a) => s2 + (Number(a.weight) || 0), 0);

  const evenAreas = async () => {
    if (!areas.length) return;
    const w = r1(100 / areas.length);
    await Promise.all(areas.map(a => supabase.from("work_areas").update({ weight: w } as any).eq("id", a.id)));
    refresh(); toast({ title: "✅ Bobot parent dibagi rata", description: `${w}% per parent WBS` });
  };

  const evenItems = async (areaId: string) => {
    const local = items.filter(i => i.work_area_id === areaId);
    if (!local.length) return;
    const w = r1(100 / local.length);
    await Promise.all(local.map(i => supabase.from("work_items").update({ weight: w } as any).eq("id", i.id)));
    refresh(); toast({ title: "✅ Bobot item dibagi rata", description: `${w}% per item` });
  };

  const [newItemFor, setNewItemFor] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ code: "", name: "", unit: "unit", qty_total: 0, weight: 0, epcc_category: "construction", start_date: "", end_date: "" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["work_areas"] });
    qc.invalidateQueries({ queryKey: ["work_items"] });
  };

  const addArea = async () => {
    if (!newArea.code || !newArea.name) { toast({ title: "Isi code & name", variant: "destructive" }); return; }
    const { error } = await supabase.from("work_areas").insert({
      project_id: projectId, code: newArea.code, name: newArea.name,
      weight: newArea.weight, sort_order: areas.length,
      epcc_category: newArea.epcc_category,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "wbs_area", "create", `Parent WBS added: ${newArea.code} - ${newArea.name}`, projectId);
    setNewArea({ code: "", name: "", weight: 0, epcc_category: "construction" }); setNewAreaOpen(false);
    refresh(); toast({ title: "✅ Parent WBS ditambahkan" });
  };

  const saveArea = async (id: string) => {
    const v = editValues[id]; if (!v) return;
    const { error } = await supabase.from("work_areas").update({ code: v.code, name: v.name, weight: Number(v.weight)||0, epcc_category: v.epcc_category } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "wbs_area", "update", `Parent WBS updated: ${v.code} - ${v.name}`, projectId, id);
    setEditingArea(null); refresh(); toast({ title: "✅ Saved" });
  };

  const delArea = async (id: string, name: string) => {
    if (!confirm(`Hapus Parent WBS "${name}" dan semua work item di dalamnya?`)) return;
    await supabase.from("work_areas").delete().eq("id", id);
    await logActivity(supabase, "wbs_area", "delete", `Parent WBS deleted: ${name}`, projectId, id);
    refresh(); toast({ title: "✅ Deleted" });
  };

  const moveArea = async (id: string, dir: -1|1) => {
    const idx = areas.findIndex(a => a.id === id);
    const swap = areas[idx + dir]; if (!swap) return;
    await supabase.from("work_areas").update({ sort_order: swap.sort_order }).eq("id", id);
    await supabase.from("work_areas").update({ sort_order: areas[idx].sort_order }).eq("id", swap.id);
    refresh();
  };

  const addItem = async (areaId: string) => {
    if (!newItem.code || !newItem.name) { toast({ title: "Isi code & name", variant: "destructive" }); return; }
    const areaItems = items.filter(i => i.work_area_id === areaId);
    const { error } = await supabase.from("work_items").insert({
      work_area_id: areaId, code: newItem.code, name: newItem.name, unit: newItem.unit,
      qty_total: newItem.qty_total, weight: newItem.weight,
      sort_order: areaItems.length, epcc_category: newItem.epcc_category,
      start_date: newItem.start_date || null, end_date: newItem.end_date || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "work_item", "create", `Child WBS: ${newItem.code} - ${newItem.name}`, projectId);
    setNewItem({ code: "", name: "", unit: "unit", qty_total: 0, weight: 0, epcc_category: "construction", start_date: "", end_date: "" });
    setNewItemFor(null); refresh(); toast({ title: "✅ Child WBS ditambahkan" });
  };

  const saveItem = async (id: string) => {
    const v = editValues[id]; if (!v) return;
    const total = Number(v.qty_total) || 0;
    const done = Number(v.qty_completed) || 0;
    const progress = total > 0 ? Math.min(100, Math.round((done/total)*100)) : 0;
    const { error } = await supabase.from("work_items").update({
      code: v.code, name: v.name, unit: v.unit,
      qty_total: total, qty_completed: done, weight: Number(v.weight)||0,
      epcc_category: v.epcc_category, progress,
      start_date: v.start_date || null, end_date: v.end_date || null,
      status: progress >= 100 ? "completed" : progress > 0 ? "in-progress" : "not-started",
    } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "work_item", "update", `Child WBS updated: ${v.code} - ${v.name}`, projectId, id);
    setEditingItem(null); refresh(); toast({ title: "✅ Saved" });
  };

  const delItem = async (id: string, name: string) => {
    if (!confirm(`Hapus Child WBS "${name}"?`)) return;
    await supabase.from("work_items").delete().eq("id", id);
    await logActivity(supabase, "work_item", "delete", `Child WBS deleted: ${name}`, projectId, id);
    refresh(); toast({ title: "✅ Deleted" });
  };

  const moveItem = async (id: string, areaId: string, dir: -1|1) => {
    const local = items.filter(i => i.work_area_id === areaId).sort((a,b) => a.sort_order - b.sort_order);
    const idx = local.findIndex(i => i.id === id);
    const swap = local[idx + dir]; if (!swap) return;
    await supabase.from("work_items").update({ sort_order: swap.sort_order }).eq("id", id);
    await supabase.from("work_items").update({ sort_order: local[idx].sort_order }).eq("id", swap.id);
    refresh();
  };

  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Work Breakdown Structure (WBS)</h3>
        <p className="w-full text-[10px] text-muted-foreground -mt-1">Aturan bobot sederhana: semua <b>Parent WBS</b> total = 100% dari proyek, dan semua <b>item</b> di dalam satu parent total = 100% dari parent tersebut. Bingung? Klik "Bagi rata".</p>
        <WeightMeter label="Total bobot parent:" total={areaTotal} count={areas.length} onEven={evenAreas} />
        <button onClick={() => setNewAreaOpen(!newAreaOpen)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><FolderPlus className="h-3 w-3" /> Add Parent WBS</button>
      </div>

      {newAreaOpen && (
        <div className="mb-3 p-3 bg-muted/30 rounded border border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div><label className={labelCls}>Code</label><input value={newArea.code} onChange={e => setNewArea({...newArea, code: e.target.value})} className={`w-full ${inputCls}`} placeholder="WA-010" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Name</label><input value={newArea.name} onChange={e => setNewArea({...newArea, name: e.target.value})} className={`w-full ${inputCls}`} placeholder="Piping Area" /></div>
            <div><label className={labelCls}>Bobot (% dari proyek)</label>
              <input type="number" value={newArea.weight} onChange={e => setNewArea({...newArea, weight: Number(e.target.value)})} className={`w-full ${inputCls}`} placeholder={`sisa ${r1(100 - areaTotal)}`} />
              <p className="text-[9px] text-muted-foreground mt-0.5">Sisa bobot tersedia: {r1(100 - areaTotal)}%</p>
            </div>
            <div><label className={labelCls}>EPCC</label>
              <select value={newArea.epcc_category} onChange={e => setNewArea({...newArea, epcc_category: e.target.value})} className={`w-full ${inputCls}`}>
                {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={addArea} className="px-3 py-1 bg-success text-success-foreground rounded text-xs"><Save className="h-3 w-3 inline mr-1" />Save</button>
            <button onClick={() => setNewAreaOpen(false)} className="px-3 py-1 bg-muted text-foreground rounded text-xs border border-border">Cancel</button>
          </div>
        </div>
      )}

      {areas.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Belum ada Parent WBS. Klik "Add Parent WBS" untuk mulai.</p>}

      <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
        {areas.map((a, aidx) => {
          const areaItems = items.filter(i => i.work_area_id === a.id).sort((x,y) => x.sort_order - y.sort_order);
          const isEditingA = editingArea === a.id;
          const ev = editValues[a.id] || a;
          return (
            <div key={a.id} className="border border-border rounded-lg p-2 bg-card">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <button disabled={aidx===0} onClick={() => moveArea(a.id, -1)} className="p-0.5 hover:bg-muted rounded disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                  <button disabled={aidx===areas.length-1} onClick={() => moveArea(a.id, 1)} className="p-0.5 hover:bg-muted rounded disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                </div>
                {isEditingA ? (
                  <>
                    <input value={ev.code} onChange={e => setEditValues({...editValues, [a.id]: {...ev, code: e.target.value}})} className={`${inputCls} w-20`} />
                    <input value={ev.name} onChange={e => setEditValues({...editValues, [a.id]: {...ev, name: e.target.value}})} className={`${inputCls} flex-1 min-w-[140px]`} />
                    <input type="number" value={ev.weight} onChange={e => setEditValues({...editValues, [a.id]: {...ev, weight: e.target.value}})} className={`${inputCls} w-16`} placeholder="bobot %" title="Bobot parent (% dari proyek)" />
                    <select value={ev.epcc_category} onChange={e => setEditValues({...editValues, [a.id]: {...ev, epcc_category: e.target.value}})} className={inputCls}>
                      {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <button onClick={() => saveArea(a.id)} className="p-1 bg-success/15 text-success rounded"><Save className="h-3 w-3" /></button>
                    <button onClick={() => setEditingArea(null)} className="p-1 bg-muted rounded"><X className="h-3 w-3" /></button>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{a.code}</span>
                    <span className="text-xs font-semibold text-foreground flex-1">{a.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{(a as any).epcc_category || 'construction'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground" title="Bobot parent ini terhadap total proyek">Bobot {r1(a.weight)}%</span>
                    <span className="text-[10px] text-muted-foreground" title="Progress">Progress {r1(a.progress)}%</span>
                    {(() => {
                      const ds = areaItems.flatMap(x => [x.start_date, x.end_date]).filter(Boolean) as string[];
                      if (!ds.length) return null;
                      const sorted = ds.slice().sort();
                      return <span className="text-[10px] text-muted-foreground">{fmtD(sorted[0])} → {fmtD(sorted[sorted.length-1])}</span>;
                    })()}
                    <button onClick={() => { setEditingArea(a.id); setEditValues({...editValues, [a.id]: a}); }} className="p-1 hover:bg-muted rounded"><Edit3 className="h-3 w-3 text-primary" /></button>
                    <button onClick={() => setNewItemFor(newItemFor === a.id ? null : a.id)} className="p-1 hover:bg-muted rounded"><Plus className="h-3 w-3 text-success" /></button>
                    <button onClick={() => delArea(a.id, a.name)} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                  </>
                )}
              </div>

              {newItemFor === a.id && (
                <div className="mt-2 ml-6 p-2 bg-muted/30 rounded border border-border/50">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                    <input value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})} className={inputCls} placeholder="WI-100" />
                    <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className={`${inputCls} sm:col-span-2`} placeholder="Child item name" />
                    <input value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className={inputCls} placeholder="unit" />
                    <input type="number" value={newItem.qty_total} onChange={e => setNewItem({...newItem, qty_total: Number(e.target.value)})} className={inputCls} placeholder="Qty" />
                    <div><label className={labelCls}>Bobot (% dari parent)</label>
                      <input type="number" value={newItem.weight} onChange={e => setNewItem({...newItem, weight: Number(e.target.value)})} className={`w-full ${inputCls}`} placeholder="mis. 25" />
                    </div>
                    <select value={newItem.epcc_category} onChange={e => setNewItem({...newItem, epcc_category: e.target.value})} className={inputCls}>
                      {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <div><label className={labelCls}>Target Start</label><input type="date" value={newItem.start_date} onChange={e => setNewItem({...newItem, start_date: e.target.value})} className={`w-full ${inputCls}`} /></div>
                    <div><label className={labelCls}>Target Finish</label><input type="date" value={newItem.end_date} onChange={e => setNewItem({...newItem, end_date: e.target.value})} className={`w-full ${inputCls}`} /></div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => addItem(a.id)} className="px-2 py-1 bg-success text-success-foreground rounded text-[10px]"><Save className="h-3 w-3 inline mr-1" />Add Child</button>
                    <button onClick={() => setNewItemFor(null)} className="px-2 py-1 bg-muted text-foreground rounded text-[10px] border border-border">Cancel</button>
                  </div>
                </div>
              )}

              {areaItems.length > 0 && (
                <div className="mt-2 ml-6 space-y-1">
                  <WeightMeter
                    label="Total bobot item di parent ini:"
                    total={areaItems.reduce((s2, i) => s2 + (Number(i.weight) || 0), 0)}
                    count={areaItems.length}
                    onEven={() => evenItems(a.id)}
                  />
                  {areaItems.map((i, iidx) => {
                    const isEditingI = editingItem === i.id;
                    const iv = editValues[i.id] || i;
                    return (
                      <div key={i.id} className="flex items-center gap-1.5 flex-wrap py-1 border-b border-border/30 text-[11px]">
                        <div className="flex flex-col gap-0.5">
                          <button disabled={iidx===0} onClick={() => moveItem(i.id, a.id, -1)} className="p-0.5 hover:bg-muted rounded disabled:opacity-30"><ChevronUp className="h-2.5 w-2.5" /></button>
                          <button disabled={iidx===areaItems.length-1} onClick={() => moveItem(i.id, a.id, 1)} className="p-0.5 hover:bg-muted rounded disabled:opacity-30"><ChevronDown className="h-2.5 w-2.5" /></button>
                        </div>
                        {isEditingI ? (
                          <>
                            <input value={iv.code} onChange={e => setEditValues({...editValues, [i.id]: {...iv, code: e.target.value}})} className={`${inputCls} w-20`} />
                            <input value={iv.name} onChange={e => setEditValues({...editValues, [i.id]: {...iv, name: e.target.value}})} className={`${inputCls} flex-1 min-w-[140px]`} />
                            <input value={iv.unit} onChange={e => setEditValues({...editValues, [i.id]: {...iv, unit: e.target.value}})} className={`${inputCls} w-16`} />
                            <input type="number" value={iv.qty_total} onChange={e => setEditValues({...editValues, [i.id]: {...iv, qty_total: e.target.value}})} className={`${inputCls} w-16`} placeholder="Total" />
                            <input type="number" value={iv.qty_completed} onChange={e => setEditValues({...editValues, [i.id]: {...iv, qty_completed: e.target.value}})} className={`${inputCls} w-16`} placeholder="Done" />
                            <input type="number" value={iv.weight} onChange={e => setEditValues({...editValues, [i.id]: {...iv, weight: e.target.value}})} className={`${inputCls} w-16`} placeholder="bobot %" title="Bobot item (% dari parent)" />
                            <input type="date" value={(iv.start_date || "").slice(0,10)} onChange={e => setEditValues({...editValues, [i.id]: {...iv, start_date: e.target.value}})} className={`${inputCls} w-[120px]`} title="Target Start" />
                            <input type="date" value={(iv.end_date || "").slice(0,10)} onChange={e => setEditValues({...editValues, [i.id]: {...iv, end_date: e.target.value}})} className={`${inputCls} w-[120px]`} title="Target Finish" />
                            <select value={iv.epcc_category} onChange={e => setEditValues({...editValues, [i.id]: {...iv, epcc_category: e.target.value}})} className={inputCls}>
                              {EPCC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <button onClick={() => saveItem(i.id)} className="p-1 bg-success/15 text-success rounded"><Save className="h-3 w-3" /></button>
                            <button onClick={() => setEditingItem(null)} className="p-1 bg-muted rounded"><X className="h-3 w-3" /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">{i.code}</span>
                            <span className="flex-1 text-foreground">{i.name}</span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary capitalize">{(i as any).epcc_category || 'construction'}</span>
                            <span className="text-[10px] text-muted-foreground">{Number(i.qty_completed)}/{Number(i.qty_total)} {i.unit}</span>
                            <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-foreground" title="Bobot item terhadap parent-nya">Bobot {r1(i.weight)}%</span>
                            <span className={`text-[10px] ${i.start_date && i.end_date ? "text-muted-foreground" : "text-destructive"}`}>
                              {i.start_date && i.end_date
                                ? `${fmtD(i.start_date)} → ${fmtD(i.end_date)}`
                                : "jadwal belum diisi"}
                            </span>
                            <span className={`text-[10px] font-medium ${i.progress >= 100 ? "text-success" : i.progress > 0 ? "text-primary" : "text-muted-foreground"}`}>{i.progress}%</span>
                            <button onClick={() => { setEditingItem(i.id); setEditValues({...editValues, [i.id]: i}); }} className="p-1 hover:bg-muted rounded"><Edit3 className="h-3 w-3 text-primary" /></button>
                            <button onClick={() => delItem(i.id, i.name)} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
