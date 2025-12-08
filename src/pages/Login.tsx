import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "ADMIN" ? "/admin" : "/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-overlay"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-0" />
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        <div className="glass rounded-2xl p-8 backdrop-blur-xl border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-24 h-24 mb-4 rounded-full bg-black/50 p-1 ring-1 ring-white/10 shadow-inner overflow-hidden">
               <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <h1 className="text-3xl font-orbitron font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              THE CUESTATION
            </h1>
            <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase mt-1">
              Management System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/40 border-white/5 h-12 text-base focus-visible:ring-primary/50 transition-all hover:bg-black/60"
                required
              />
            </div>
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/40 border-white/5 h-12 text-base focus-visible:ring-primary/50 transition-all hover:bg-black/60"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 font-orbitron text-base bg-primary hover:bg-primary/90 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
              disabled={isSubmitting || loading}
            >
              {(isSubmitting || loading) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-8 opacity-50">
          Authorized Personnel Only • v2.0 • Developed and Maintained by BlankSpace Agency
        </p>
      </div>
    </div>
  );
};

export default Login;