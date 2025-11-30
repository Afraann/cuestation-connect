import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, Menu, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisSection from "@/components/admin/AnalysisSection";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, max, min } from "date-fns";
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
  
  // Default to today
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Business constraints
  const businessStartDate = new Date(2025, 10, 28); // Nov 28, 2025 (Month 10 is Nov)
  const today = new Date();

  // 1. Daily Range
  const dailyRange = selectedDate ? {
    from: selectedDate,
    to: selectedDate
  } : undefined;

  // 2. Weekly Range (Start of week to End of week, clamped)
  const weeklyRange = selectedDate ? {
    from: max([startOfWeek(selectedDate, { weekStartsOn: 1 }), businessStartDate]), // Monday start
    to: min([endOfWeek(selectedDate, { weekStartsOn: 1 }), today])
  } : undefined;

  // 3. Monthly Range (Start of month to End of month, clamped)
  const monthlyRange = selectedDate ? {
    from: max([startOfMonth(selectedDate), businessStartDate]),
    to: min([endOfMonth(selectedDate), today])
  } : undefined;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-orbitron text-gradient-ps5">
          Admin Dashboard
        </h1>
        
        {/* Hamburger Menu Section */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
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

      {/* Date Picker Centered */}
      <div className="flex justify-center mb-10">
        <DatePicker 
          date={selectedDate} 
          setDate={setSelectedDate} 
          className="w-[280px] shadow-lg border-primary/20"
        />
      </div>

      {/* Desktop View: 3 Columns Grid */}
      <div className="hidden lg:grid grid-cols-3 gap-8 h-full min-h-[600px]">
        {/* Daily Column */}
        <div className="h-full">
          <AnalysisSection title="Daily" dateRange={dailyRange} />
        </div>
        
        {/* Weekly Column with Border */}
        <div className="border-l border-border/30 pl-8 h-full">
          <AnalysisSection title="Weekly" dateRange={weeklyRange} />
        </div>
        
        {/* Monthly Column with Border */}
        <div className="border-l border-border/30 pl-8 h-full">
          <AnalysisSection title="Monthly" dateRange={monthlyRange} />
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
            <AnalysisSection title="Daily Analysis" dateRange={dailyRange} />
          </TabsContent>
          <TabsContent value="weekly" className="mt-0">
            <AnalysisSection title="Weekly Analysis" dateRange={weeklyRange} />
          </TabsContent>
          <TabsContent value="monthly" className="mt-0">
            <AnalysisSection title="Monthly Analysis" dateRange={monthlyRange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;