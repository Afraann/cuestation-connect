import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    // Added p-4 to ensure the card doesn't touch edges on mobile
    <div className="min-h-screen flex items-center justify-center relative bg-black p-4">
      {/* Background Image with Overlay */}
      <div 
        // CHANGED: bg-cover for mobile (fills screen), md:bg-contain for desktop (your preference)
        className="absolute inset-0 z-0 bg-cover md:bg-contain bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/bg.png')", 
        }}
      >
        <div className="absolute inset-0 bg-black/80" /> {/* Darker overlay for black theme */}
      </div>

      <Card className="w-full max-w-md border-zinc-800 bg-black backdrop-blur-none z-10 shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="flex justify-center mb-4">
            {/* Logo Image without container box/padding */}
            <img 
              src="/logo.jpg" 
              alt="Cuestation Logo" 
              className="h-24 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-3xl font-orbitron text-white uppercase tracking-wider">
            The CUESTATION
          </CardTitle>
          <CardDescription className="text-zinc-400 font-medium">
            Gaming Club
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 h-12 text-white placeholder:text-zinc-500 focus-visible:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 h-12 text-white placeholder:text-zinc-500 focus-visible:ring-primary/50"
              />
            </div>
            <Button type="submit" className="w-full glow-ps5 h-12 font-orbitron tracking-wide text-lg mt-2">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;