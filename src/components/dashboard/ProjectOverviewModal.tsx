import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DbProject, resolveImageUrl, formatRupiah, formatIDR, BILLING_STATUS_CLASS, BILLING_STATUSES } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { X, MapPin, Calendar, User, Camera, FileText, ShieldAlert, Receipt, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useAddendums, useAllAlerts } from "@/hooks/useProjects";
import { useBillings } from "@/components/data-entry/BillingPanel";

import { getStatusMeta } from "@/lib/supabase";
import { useDemoLevel } from "@/contexts/DemoLevelContext";

type OverviewTab = "photos" | "contracts" | "risks" | "bal";

const contractStatusLabel = (status: string) => {
  if (status === "potential") return "Potensial";
  if (status === "pending" || status === "on_progress") return "On Progress";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status;
};

const billingStatusLabel = (status: string) => BILLING_STATUSES.find(item => item.value === status)?.label || status;

export function ProjectOverviewModal({ project, onClose }: { project: DbProject; onClose: () => void }) {
  const { isClient } = useAuth();
  const [activeTab, setActiveTab] = useState<OverviewTab>("photos");
  const [weeklyPhotos, setWeeklyPhotos] = useState<any[]>([]);
  const { data: contracts = [] } = useAddendums(project.id);
  const { data: risks = [] } = useAllAlerts(project.id);
  const { data: billings = [] } = useBillings(project.id);
  const { level: demoLevel } = useDemoLevel();
  const L3 = demoLevel === 3;
  const st = getStatusMeta(project.status);
  const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
  const contractValue = project.contract_value || project.budget;
  const margin = contractValue > 0 && project.rap > 0 ? Math.round(((contractValue - project.rap) / contractValue) * 100) : 0;

  // Foto di-cache agar popup yang dibuka ulang tampil instan.
  const { data: photoData } = useQuery({
    queryKey: ["overview_photos", project.id],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("project_photos").select("id, photo_url, caption, week_label, uploaded_at").eq("project_id", project.id)
        .order("uploaded_at", { ascending: false }).limit(6);
      return data || [];
    },
  });
  useEffect(() => { setWeeklyPhotos(photoData || []); }, [photoData]);

  const overviewTabs: { key: OverviewTab; label: string; icon: typeof Camera; count?: number }[] = [
    { key: "photos", label: "Foto", icon: Camera, count: weeklyPhotos.length },
    { key: "contracts", label: "Kontrak", icon: FileText, count: contracts.length },
    { key: "risks", label: "Risk", icon: ShieldAlert, count: risks.length },
    { key: "bal", label: "BAL", icon: Receipt, count: billings.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header with weekly photo (latest) */}
        <div className="relative h-40 overflow-hidden rounded-t-xl">
          {weeklyPhotos[0]?.photo_url ? (
            <img src={weeklyPhotos[0].photo_url} alt={`${project.name} - ${weeklyPhotos[0].week_label || 'Latest'}`} className="w-full h-full object-cover" />
          ) : project.image_url ? (
            <img src={resolveImageUrl(project.image_url)} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          {weeklyPhotos[0]?.week_label && (
            <div className="absolute top-3 right-12 z-10 bg-card/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-foreground border border-border">
              📷 {weeklyPhotos[0].week_label}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-card/80 backdrop-blur rounded-full hover:bg-card transition-colors z-10">
            <X className="h-4 w-4 text-foreground" />
          </button>
          <div className="absolute top-3 left-3 z-10">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-card/90 backdrop-blur shadow-sm ${st.className}`}>{st.label}</span>
          </div>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-xs font-mono-data text-primary">{project.project_code}</p>
            <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Fase: <strong className="text-foreground">{project.phase}</strong></span>
          </div>


          {project.description && <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" /> Lokasi</div>
              <p className="text-xs font-medium text-foreground">{project.location}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><User className="h-3 w-3" /> PM</div>
              <p className="text-xs font-medium text-foreground">{project.manager}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Calendar className="h-3 w-3" /> Mulai</div>
              <p className="text-xs font-medium text-foreground">{new Date(project.start_date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Calendar className="h-3 w-3" /> Target</div>
              <p className="text-xs font-medium text-foreground">{new Date(project.end_date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Progress Keseluruhan</span>
              <span className="text-xs font-mono-data text-primary">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          {/* Enterprise Data: TKDN, Margin, Budget */}
          {/* Financial block — hidden for Public role (client) */}
          {!isClient && !L3 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/20 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Contract Value</p>
                  <p className="text-xs font-bold font-mono-data text-primary">{formatRupiah(contractValue)}</p>
                </div>
                <div className="bg-warning/5 rounded-lg p-2.5 border border-warning/20 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">RAP</p>
                  <p className="text-xs font-bold font-mono-data text-warning">{formatRupiah(project.rap)}</p>
                </div>
                <div className="rounded-lg p-2.5 border border-border text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">🇮🇩 TKDN</p>
                  <p className="text-xs font-bold font-mono-data text-foreground">{project.tkdn_percentage}%</p>
                </div>
                <div className={`rounded-lg p-2.5 border text-center ${margin >= 10 ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
                  <p className="text-[9px] text-muted-foreground uppercase">Margin</p>
                  <p className={`text-xs font-bold font-mono-data ${margin >= 10 ? "text-success" : "text-warning"}`}>{margin}%</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Anggaran Proyek</span>
                  <span className={`text-xs font-mono-data ${budgetPct > 85 ? "text-destructive" : budgetPct > 70 ? "text-warning" : "text-success"}`}>{budgetPct}% terpakai</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Actual Cash Out: <strong className="text-foreground font-mono-data">{formatRupiah(project.spent)}</strong></span>
                  <span className="text-muted-foreground">RAP: <strong className="text-accent font-mono-data">{formatRupiah(project.rap || project.budget)}</strong></span>
                </div>
                <Progress value={budgetPct} className="h-1.5 mt-2" />
              </div>
            </>
          )}


          {/* Project overview tabs */}
          <div>
            <div className="flex items-center gap-1 mb-3 border-b border-border pb-2 overflow-x-auto">
              {overviewTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  <tab.icon className="h-3.5 w-3.5" />{tab.label}<span className="opacity-70">({tab.count || 0})</span>
                </button>
              ))}
            </div>

            {activeTab === "photos" && (
              <div>
                {weeklyPhotos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Belum ada foto weekly untuk proyek ini.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {weeklyPhotos.map(p => (
                      <div key={p.id} className="rounded-lg overflow-hidden border border-border">
                        <img src={p.photo_url} alt={p.caption || "Weekly photo"} loading="lazy" decoding="async" className="w-full h-28 object-cover bg-muted" />
                        <div className="p-1.5">
                          {p.week_label && <p className="text-[9px] text-primary font-medium">{p.week_label}</p>}
                          {p.caption && <p className="text-[9px] text-muted-foreground truncate">{p.caption}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "contracts" && (
              <div className="space-y-2">
                {contracts.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Belum ada data kontrak.</p> : contracts.map(contract => (
                  <div key={contract.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-mono-data text-xs font-semibold text-primary">{contract.addendum_code}</p><p className="mt-0.5 text-xs text-foreground">{contract.description}</p></div>
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{contractStatusLabel(contract.approval_status)}</span>
                    </div>
                    {contract.notes && <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{contract.notes}</p>}
                    {contract.document_url && <a href={contract.document_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Buka Dokumen</a>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "risks" && (
              <div className="space-y-2">
                {risks.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Belum ada data risk.</p> : risks.map(risk => (
                  <div key={risk.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-foreground">{risk.title}</p><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${risk.severity === "critical" || risk.severity === "high" ? "border-destructive/30 bg-destructive/10 text-destructive" : risk.severity === "medium" ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-muted text-muted-foreground"}`}>{risk.severity}</span></div>
                    {risk.description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{risk.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground"><span>Status: <strong className="text-foreground">{risk.current_status}</strong></span><span>PIC: <strong className="text-foreground">{risk.pic || risk.risk_owner || "—"}</strong></span><span>Progress: <strong className="text-foreground">{risk.completion_percentage}%</strong></span></div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "bal" && (
              <div className="overflow-x-auto rounded-lg border border-border">
                {billings.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Belum ada data BAL.</p> : <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr>{["BAL", "Deskripsi", "Progress", "Nominal", "Status"].map(label => <th key={label} className="px-3 py-2 text-left text-[10px] uppercase text-muted-foreground">{label}</th>)}</tr></thead>
                  <tbody>{billings.map(row => <tr key={row.id} className="border-t border-border"><td className="whitespace-nowrap px-3 py-2 font-mono-data font-medium text-primary">{row.termin_code}</td><td className="px-3 py-2 text-foreground">{row.description || "—"}</td><td className="whitespace-nowrap px-3 py-2 font-mono-data text-muted-foreground">{row.plan_progress_pct}%</td><td className="whitespace-nowrap px-3 py-2 font-mono-data text-foreground">{formatIDR(row.plan_amount)}</td><td className="px-3 py-2"><span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${BILLING_STATUS_CLASS[row.status] || "border-border text-muted-foreground"}`}>{billingStatusLabel(row.status)}</span></td></tr>)}</tbody>
                </table>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
