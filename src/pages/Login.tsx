import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Eye, EyeOff, LogIn, UserPlus, Shield, Briefcase, Users, Monitor } from "lucide-react";

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; desc: string; color: string }> = {
  admin: { label: "Administrator", icon: Shield, desc: "Full system access & data management", color: "border-primary text-primary" },
  management: { label: "Director / Management", icon: Briefcase, desc: "Executive overview, all projects read-only", color: "border-accent text-accent" },
  team: { label: "Project Team", icon: Users, desc: "Operational control for assigned project", color: "border-success text-success" },
  client: { label: "War Room / Client", icon: Monitor, desc: "Client-facing project showcase", color: "border-info text-info" },
};

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await signIn(email, password);
        if (res.error) { setError(res.error); return; }
      } else {
        const res = await signUp(email, password, displayName, selectedRole);
        if (res.error) { setError(res.error); return; }
      }
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

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
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Sign in to access the control tower" : "Register a new user account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                    className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Ir. Bambang Suryanto" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(roleConfig) as [AppRole, typeof roleConfig.admin][]).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => setSelectedRole(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${selectedRole === key ? `${cfg.color} border-current bg-card shadow-sm` : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                        <cfg.icon className="h-4 w-4 mb-1" />
                        <p className="text-xs font-medium">{cfg.label}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">{cfg.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@pamitra.co.id" />
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
                mode === "login" ? <><LogIn className="h-4 w-4" /> Sign In</> : <><UserPlus className="h-4 w-4" /> Create Account</>}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            {mode === "login" ? (
              <>Don't have an account? <button onClick={() => setMode("register")} className="text-primary font-medium hover:underline">Register</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Sign In</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
