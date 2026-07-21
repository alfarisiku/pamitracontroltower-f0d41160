import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await signIn(email, password, rememberMe);
        if (res.error) { setError(res.error); return; }
        navigate("/");
      } else {
        const res = await signUp(email, password, displayName);
        if (res.error) { setError(res.error); return; }
        setRegistered(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Registrasi Berhasil</h2>
          <p className="text-muted-foreground">
            Akun Anda telah terdaftar dan sedang menunggu persetujuan administrator.
            Anda akan mendapat akses setelah akun disetujui.
          </p>
          <button onClick={() => { setRegistered(false); setMode("login"); }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-foreground relative flex-col justify-between p-10">
        <div>
          <img src="/images/pamitra-logo.png" alt="Pamitra" className="h-12 brightness-0 invert mb-2" />
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: "hsl(215, 80%, 65%)" }}>EPC Oil and Gas</p>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
            Project Control<br />Tower
          </h2>
          <p className="text-sm" style={{ color: "hsl(215, 15%, 60%)" }}>
            Single source of truth for all EPC project monitoring.<br />
            One database. Three views. Powerful insights.
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs" style={{ color: "hsl(215, 15%, 50%)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
            System Online
          </div>
          <span>© 2026 PT Pamitra Jaya Konstruksi</span>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="h-12 mx-auto mb-2" />
            <h1 className="text-lg font-bold text-foreground">Pamitra Control Tower</h1>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {mode === "login" ? "Welcome back" : "Daftar Akun Baru"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Sign in to access the control tower" : "Akun baru memerlukan persetujuan admin sebelum dapat digunakan"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Nama Lengkap</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                  className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Ir. Bambang Suryanto" />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="user@pamitra.co.id" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> :
                mode === "login" ? <><LogIn className="h-4 w-4" /> Sign In</> : <><UserPlus className="h-4 w-4" /> Register</>}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            {mode === "login" ? (
              <>Don't have an account? <button onClick={() => setMode("register")} className="text-primary font-medium hover:underline">Register</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Sign In</button></>
            )}
          </p>

          {mode === "login" && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Default Accounts</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button onClick={() => { setEmail("admin@pamitra.co.id"); setPassword("admin123"); }}
                  className="p-2 rounded border border-border hover:bg-muted text-left">
                  <p className="font-medium text-foreground">Admin</p>
                  <p className="text-muted-foreground">admin@pamitra.co.id</p>
                </button>
                <button onClick={() => { setEmail("director@pamitra.co.id"); setPassword("director123"); }}
                  className="p-2 rounded border border-border hover:bg-muted text-left">
                  <p className="font-medium text-foreground">Director</p>
                  <p className="text-muted-foreground">director@pamitra.co.id</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
