import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogOut } from "lucide-react";

const PendingApproval = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
          <Clock className="h-10 w-10 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Menunggu Persetujuan</h1>
        <p className="text-muted-foreground leading-relaxed">
          Akun Anda <span className="font-medium text-foreground">({profile?.display_name})</span> sedang dalam proses review oleh administrator.
          Anda akan mendapat akses penuh setelah akun disetujui dan role ditetapkan.
        </p>
        <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Apa yang terjadi selanjutnya?</p>
          <ul className="text-left space-y-1 list-disc list-inside">
            <li>Admin akan mereview akun Anda</li>
            <li>Role akan ditetapkan (Project Team / Management)</li>
            <li>Proyek akan di-assign ke akun Anda</li>
            <li>Anda bisa login kembali setelah disetujui</li>
          </ul>
        </div>
        <button onClick={signOut}
          className="inline-flex items-center gap-2 px-6 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
