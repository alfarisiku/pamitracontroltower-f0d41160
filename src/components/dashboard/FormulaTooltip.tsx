import { useState } from "react";
import { Info, X } from "lucide-react";

interface FormulaTooltipProps {
  title: string;
  formula: string;
  description: string;
  interpretation?: string;
}

export function FormulaTooltip({ title, formula, description, interpretation }: FormulaTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="ml-1 p-0.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
        aria-label={`Info: ${title}`}
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-card border border-border rounded-lg shadow-lg p-3 text-left animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">{title}</span>
              <button onClick={() => setOpen(false)} className="p-0.5 hover:bg-muted rounded"><X className="h-3 w-3" /></button>
            </div>
            <div className="bg-muted/50 rounded px-2 py-1.5 mb-2 font-mono text-[11px] text-primary border border-border/50">
              {formula}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>
            {interpretation && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">Standar:</span> {interpretation}</p>
              </div>
            )}
          </div>
        </>
      )}
    </span>
  );
}

// Predefined formula configs
export const FORMULAS = {
  cpi: {
    title: "CPI (Cost Performance Index)",
    formula: "CPI = (Progress% × RAP) / Actual Cash Out",
    description: "Mengukur efisiensi biaya proyek berdasarkan Rencana Anggaran Pelaksanaan (RAP) vs realisasi cash out. Menggambarkan berapa nilai pekerjaan (earned value pada basis RAP) yang didapat per rupiah cash out yang telah dikeluarkan.",
    interpretation: "CPI > 1.0 = Cost efisien (baik), CPI = 1.0 = Sesuai RAP, CPI < 1.0 = Over RAP (buruk)",
  },
  spi: {
    title: "SPI (Schedule Performance Index)",
    formula: "SPI = Actual Progress / Planned Progress",
    description: "Mengukur efisiensi jadwal proyek. Seberapa cepat pekerjaan diselesaikan vs rencana.",
    interpretation: "SPI > 1.0 = Ahead of schedule, SPI = 1.0 = On schedule, SPI < 1.0 = Behind schedule",
  },
  budgetUtil: {
    title: "Actual Cash Out vs RAP",
    formula: "Utilisasi RAP = (Actual Cash Out / RAP) × 100%",
    description: "Persentase realisasi cash out proyek terhadap Rencana Anggaran Pelaksanaan (RAP). Bukan terhadap Nilai Kontrak, karena RAP adalah baseline biaya internal proyek.",
    interpretation: "< 85% = Normal, 85-95% = Perlu perhatian, > 95% = Kritis (risiko over RAP)",
  },
  profitMargin: {
    title: "Profit Margin",
    formula: "Margin = ((Budget - Spent) / Budget) × 100%",
    description: "Estimasi margin keuntungan berdasarkan sisa anggaran terhadap total budget.",
    interpretation: "> 15% = Sehat, 5-15% = Normal, < 5% = Tipis, Negatif = Rugi",
  },
  scheduleHealth: {
    title: "Schedule Health",
    formula: "Deviasi = Actual Progress − Planned Progress",
    description: "Perbandingan progress aktual vs progress yang seharusnya berdasarkan waktu yang telah berjalan. Positif = ahead, Negatif = behind.",
    interpretation: "Deviasi ≥ -5% = Good, -5% s/d -15% = At Risk, < -15% = Critical",
  },
  timeProgress: {
    title: "Time Progress",
    formula: "Time % = (Hari Berjalan / Total Durasi) × 100%",
    description: "Persentase waktu proyek yang telah berjalan. Hari Berjalan = Total Durasi − Sisa Hari (dihitung dari start_date sampai hari ini).",
    interpretation: "Bandingkan dengan Progress Aktual: jika Actual < Time = behind, Actual ≈ Time = on track, Actual > Time = ahead.",
  },
  deviation: {
    title: "Deviasi Progress",
    formula: "Deviasi = Actual % − Planned %",
    description: "Selisih realisasi terhadap rencana pada periode berjalan. Positif (+) = di atas rencana, Negatif (−) = di bawah rencana.",
    interpretation: "≥ 0% = Sesuai/Ahead, -5% s/d 0% = Watch, < -5% = Behind",
  },
  netPeriode: {
    title: "Net Cashflow Periode",
    formula: "Net = Cash In − Cash Out",
    description: "Selisih arus kas masuk dan keluar pada satu periode. Dihitung terpisah untuk Plan dan Actual. Positif = surplus periode, Negatif = defisit periode.",
    interpretation: "Positif = periode profit, Negatif = periode butuh talangan cash",
  },
  cumulativeNet: {
    title: "Kumulatif Net Cashflow",
    formula: "Kumulatif Net = Σ (Cash In − Cash Out) sampai periode ini",
    description: "Akumulasi Net Periode dari awal proyek hingga periode berjalan. Titik potong dari negatif ke positif = breakeven proyek.",
    interpretation: "Positif = sudah breakeven, Negatif = belum breakeven / masih defisit kumulatif",
  },
  costVariance: {
    title: "Cost Variance per Kategori",
    formula: "Variance = RAP − Actual",
    description: "Sisa RAP terhadap realisasi pengeluaran per kategori. Positif (+) = hemat / masih ada sisa RAP, Negatif (−) = over RAP.",
    interpretation: "Positif = under budget (baik), 0 = pas RAP, Negatif = over RAP (buruk)",
  },
  costUtilization: {
    title: "Utilisasi RAP per Kategori",
    formula: "% = (Actual / RAP) × 100%",
    description: "Persentase realisasi cash out terhadap RAP kategori. Digunakan untuk memantau kategori mana yang paling terkuras.",
    interpretation: "< 85% = Normal, 85-100% = Perlu perhatian, > 100% = Over RAP (kritis)",
  },
};
