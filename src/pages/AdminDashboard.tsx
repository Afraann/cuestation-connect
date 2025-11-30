import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalysisSection from "@/components/admin/AnalysisSection";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, max, min } from "date-fns";

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Default to today
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Business constraints
  const businessStartDate = new Date(2025, 10, 28); // Nov 28, 2025
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
          The CueStation
        </h1>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <span className="text-muted-foreground hidden md:inline-block text-sm">
            {user?.username} ({user?.role})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="text-muted-foreground hover:text-primary"
          >
            <Settings className="h-5 w-5 mr-2" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:text-destructive/80">
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
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