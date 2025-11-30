import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  role: "ADMIN" | "STAFF";
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const userData = localStorage.getItem("cuestation_user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  };

  const login = async (username: string, password: string) => {
    try {
      // Fetch user from database
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", username)
        .single();

      if (userError || !users) {
        toast.error("Invalid credentials");
        return;
      }

      // For demo purposes, we're not validating password hash
      // In production, use proper bcrypt validation via edge function
      
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", users.id)
        .single();

      if (roleError || !roleData) {
        toast.error("User role not found");
        return;
      }

      const userData: User = {
        id: users.id,
        username: users.username,
        role: roleData.role as "ADMIN" | "STAFF",
      };

      localStorage.setItem("cuestation_user", JSON.stringify(userData));
      setUser(userData);
      toast.success(`Welcome back, ${username}!`);

      // Navigate based on role
      if (userData.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error("Login failed");
      console.error("Login error:", error);
    }
  };

  const logout = async () => {
    localStorage.removeItem("cuestation_user");
    setUser(null);
    navigate("/login");
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
