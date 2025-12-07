import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, Menu, User, FileText, Receipt, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisSection from "@/components/admin/AnalysisSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-orbitron text-gradient-ps5">
          Admin Dashboard
        </h1>
        
        {/* Hamburger Menu Section */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full h-10 w-10 bg-background/80 backdrop-blur border-primary/20 shadow-lg hover:bg-zinc-800"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <User className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{user?.username}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate("/admin/sessions")} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Session Details
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/admin/expenses")} className="gap-2 cursor-pointer">
                <Receipt className="h-4 w-4" />
                Expense Sheet
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/admin/direct-sales")} className="gap-2 cursor-pointer">
                <ShoppingCart className="h-4 w-4" />
                Counter Sales
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop View: 3 Columns Grid */}
      <div className="hidden lg:grid grid-cols-3 gap-8 h-full min-h-[600px]">
        {/* Daily Column */}
        <div className="h-full">
          <AnalysisSection title="Daily" variant="daily" />
        </div>
        
        {/* Weekly Column with Border */}
        <div className="border-l border-border/30 pl-8 h-full">
          <AnalysisSection title="Weekly" variant="weekly" />
        </div>
        
        {/* Monthly Column with Border */}
        <div className="border-l border-border/30 pl-8 h-full">
          <AnalysisSection title="Monthly" variant="monthly" />
        </div>
      </div>

      {/* Mobile/Tablet View: Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
            <TabsTrigger value="daily" className="text-base font-orbitron">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-base font-orbitron">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-base font-orbitron">Monthly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-0">
            <AnalysisSection title="Daily" variant="daily" />
          </TabsContent>
          <TabsContent value="weekly" className="mt-0">
            <AnalysisSection title="Weekly" variant="weekly" />
          </TabsContent>
          <TabsContent value="monthly" className="mt-0">
            <AnalysisSection title="Monthly" variant="monthly" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;