import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Shield, Users, BarChart3, Database, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-5 space-y-3">
    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" /> {title}
    </h3>
    {children}
  </div>
);

const Step = ({ n, text }: { n: number; text: string }) => (
  <div className="flex items-start gap-3">
    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-[10px] font-bold text-primary">{n}</span>
    </div>
    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
  </div>
);

// Admin Guide
const AdminGuide = () => (
  <div className="space-y-4">
    <Section title="Manage Projects (CRUD)" icon={Database}>
      <Step n={1} text="Buka menu Data Entry dari sidebar." />
      <Step n={2} text="Pilih tab 'Manage Projects' untuk membuat, mengedit, atau menghapus proyek." />
      <Step n={3} text="Isi semua field: Project Code, Name, Manager, Category, Location, Date, Client." />
      <Step n={4} text="Upload foto, video, dan CCTV link di tab media." />
      <Step n={5} text="Klik Save untuk menyimpan perubahan ke database." />
    </Section>
    <Section title="WBS & Milestone" icon={BarChart3}>
      <Step n={1} text="Pilih proyek, lalu buka tab 'Structural Update'." />
      <Step n={2} text="Tambah Work Area → Work Item → Sub Task untuk struktur WBS." />
      <Step n={3} text="Atur milestone dan target date untuk tracking jadwal." />
      <Step n={4} text="Update weight dan progress untuk kalkulasi otomatis." />
    </Section>
    <Section title="Approve Users" icon={Shield}>
      <Step n={1} text="Buka menu Account Manager dari sidebar." />
      <Step n={2} text="Lihat daftar user dengan status 'Pending' di bagian atas." />
      <Step n={3} text="Klik 'Approve & Assign' untuk menyetujui user baru." />
      <Step n={4} text="Pilih Role (Project Team / Management) dan assign proyek yang sesuai." />
      <Step n={5} text="Klik Save. User kini dapat mengakses sistem sesuai role." />
    </Section>
    <Section title="Manage Roles & Access" icon={Users}>
      <Step n={1} text="Di Account Manager, klik ikon Edit pada user manapun." />
      <Step n={2} text="Ubah role menggunakan dropdown (Team, Management, Admin, Client)." />
      <Step n={3} text="Untuk role Team, pilih proyek yang di-assign (multi-select)." />
      <Step n={4} text="User dengan role Management/Admin otomatis melihat semua proyek." />
    </Section>
    <Section title="Cost & Budget" icon={BarChart3}>
      <Step n={1} text="Masuk ke Structural Update, pilih proyek." />
      <Step n={2} text="Update budget dan spent untuk tracking cost performance." />
      <Step n={3} text="Gunakan Cost Performance page untuk monitoring CPI & SPI." />
    </Section>
  </div>
);

// Team Guide
const TeamGuide = () => (
  <div className="space-y-4">
    <Section title="Update Progress Mingguan" icon={CheckCircle2}>
      <Step n={1} text="Buka Data Entry dari sidebar." />
      <Step n={2} text="Proyek Anda akan otomatis terpilih (sesuai assignment)." />
      <Step n={3} text="Update progress (%), status, dan phase proyek." />
      <Step n={4} text="Update quantity completed pada work item yang relevan." />
      <Step n={5} text="Klik Save Update untuk menyimpan." />
    </Section>
    <Section title="Laporkan Issue & Risk" icon={AlertTriangle}>
      <Step n={1} text="Di tab Regular Update, scroll ke bagian Risk/Issue." />
      <Step n={2} text="Tambah risk baru dengan judul, severity, probability, dan impact." />
      <Step n={3} text="Isi mitigation plan untuk setiap risk yang teridentifikasi." />
      <Step n={4} text="Risk akan otomatis muncul di dashboard monitoring." />
    </Section>
    <Section title="Upload Dokumentasi" icon={Database}>
      <Step n={1} text="Pada form update, gunakan field foto/media." />
      <Step n={2} text="Upload foto progress site terbaru setiap minggu." />
      <Step n={3} text="Foto akan tampil di Project Detail dan Overview." />
    </Section>
    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
      <h4 className="text-xs font-bold text-accent mb-2">⚠️ Aturan Penting</h4>
      <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
        <li>Anda hanya bisa mengakses proyek yang di-assign kepada Anda.</li>
        <li>Update dilakukan mingguan (setiap Jumat).</li>
        <li>Anda tidak bisa mengubah master data proyek (WBS, budget baseline).</li>
        <li>Jika perlu perubahan struktural, hubungi Admin.</li>
      </ul>
    </div>
  </div>
);

// Director Guide
const DirectorGuide = () => (
  <div className="space-y-4">
    <Section title="Membaca Dashboard" icon={BarChart3}>
      <Step n={1} text="Overview page menampilkan ringkasan KPI seluruh portofolio." />
      <Step n={2} text="Total Projects = jumlah proyek aktif + completed." />
      <Step n={3} text="Contract Value = total nilai kontrak seluruh proyek." />
      <Step n={4} text="Overall Progress = rata-rata progress semua proyek." />
    </Section>
    <Section title="Interpretasi Performance" icon={CheckCircle2}>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <ArrowRight className="h-3 w-3 text-success mt-1 flex-shrink-0" />
          <p className="text-xs text-muted-foreground"><span className="font-medium text-success">SPI {'>'} 1.0</span> = Progress lebih cepat dari rencana</p>
        </div>
        <div className="flex items-start gap-2">
          <ArrowRight className="h-3 w-3 text-destructive mt-1 flex-shrink-0" />
          <p className="text-xs text-muted-foreground"><span className="font-medium text-destructive">SPI {'<'} 1.0</span> = Terlambat dari jadwal</p>
        </div>
        <div className="flex items-start gap-2">
          <ArrowRight className="h-3 w-3 text-success mt-1 flex-shrink-0" />
          <p className="text-xs text-muted-foreground"><span className="font-medium text-success">CPI {'>'} 1.0</span> = Biaya lebih efisien dari budget</p>
        </div>
        <div className="flex items-start gap-2">
          <ArrowRight className="h-3 w-3 text-destructive mt-1 flex-shrink-0" />
          <p className="text-xs text-muted-foreground"><span className="font-medium text-destructive">CPI {'<'} 1.0</span> = Over budget</p>
        </div>
      </div>
    </Section>
    <Section title="Fokus Perhatian" icon={AlertTriangle}>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>🔴 <span className="font-medium text-destructive">Proyek Delayed/At Risk</span> — lihat di Risk Monitoring untuk detail masalah</p>
        <p>📉 <span className="font-medium text-accent">Deviasi {'>'} 10%</span> — perlu eskalasi ke project team</p>
        <p>📊 <span className="font-medium text-primary">Trend menurun</span> — pantau Cost Performance untuk identifikasi akar masalah</p>
        <p>✅ <span className="font-medium text-success">On Track</span> — proyek berjalan sesuai rencana</p>
      </div>
    </Section>
    <Section title="Navigasi Cepat" icon={BookOpen}>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">Overview</p>
          <p className="text-muted-foreground">Ringkasan KPI portofolio</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">Project Summary</p>
          <p className="text-muted-foreground">Detail per proyek</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">Cost Performance</p>
          <p className="text-muted-foreground">CPI, SPI, cashflow</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">Risk Monitoring</p>
          <p className="text-muted-foreground">Risk matrix & alerts</p>
        </div>
      </div>
    </Section>
  </div>
);

const UserGuide = () => {
  const { role } = useAuth();

  const guideTitle = role === "admin" ? "Admin Guide" : role === "management" ? "Director Guide" : "Project User Guide";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <DashboardHeader />
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">{guideTitle}</h2>
              <p className="text-xs text-muted-foreground">Panduan penggunaan sistem sesuai role Anda</p>
            </div>
          </div>
          {role === "admin" && <AdminGuide />}
          {role === "management" && <DirectorGuide />}
          {(role === "team" || role === "client") && <TeamGuide />}
          {!role && <TeamGuide />}
        </div>
      </main>
    </div>
  );
};

export default UserGuide;
