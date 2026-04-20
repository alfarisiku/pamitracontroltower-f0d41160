import { useState, useEffect } from "react";
import { Calendar, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function PhotoGallery({ projectId }: { projectId: string }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase.from("project_photos").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }).then(({ data }) => {
      setPhotos(data || []);
      setLoading(false);
    });
  }, [projectId]);

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Hapus foto ini?")) return;
    const pathMatch = url.match(/project-photos\/(.+)$/);
    if (pathMatch) await supabase.storage.from("project-photos").remove([pathMatch[1]]);
    await supabase.from("project_photos").delete().eq("id", id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading photos...</p>;
  if (photos.length === 0) return <p className="text-xs text-muted-foreground">Belum ada foto untuk proyek ini.</p>;

  const grouped = photos.reduce((acc: Record<string, any[]>, p) => {
    const key = p.week_label || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-3 mt-2">
      {Object.entries(grouped).map(([week, wPhotos]) => (
        <div key={week}>
          <h4 className="text-[10px] font-semibold text-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" /> {week}
            <span className="text-muted-foreground font-normal">({(wPhotos as any[]).length} foto)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(wPhotos as any[]).map(p => (
              <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border">
                <img src={p.photo_url} alt={p.caption || "Project photo"} className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleDelete(p.id, p.photo_url)} className="p-1.5 bg-destructive text-destructive-foreground rounded-full"><Trash2 className="h-3 w-3" /></button>
                </div>
                {p.caption && <div className="p-1 text-[9px] text-muted-foreground truncate">{p.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
