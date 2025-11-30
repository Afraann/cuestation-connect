import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import RevenueCard from "@/components/admin/RevenueCard";
import PaymentBreakdown from "@/components/admin/PaymentBreakdown";
import InsightsGrid from "@/components/admin/InsightsGrid";

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [yearlyRevenue, setYearlyRevenue] = useState(0);

  useEffect(() => {
    fetchRevenue();
  }, [selectedDate]);

  const fetchRevenue = async () => {
    // Fetch daily revenue
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: dailyData } = await supabase
      .from("sessions")
      .select("final_amount")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .eq("status", "COMPLETED");

    const daily = dailyData?.reduce((sum, s) => sum + (s.final_amount || 0), 0) || 0;
    setDailyRevenue(daily);

    // Fetch monthly revenue
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);

    const { data: monthlyData } = await supabase
      .from("sessions")
      .select("final_amount")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString())
      .eq("status", "COMPLETED");

    const monthly = monthlyData?.reduce((sum, s) => sum + (s.final_amount || 0), 0) || 0;
    setMonthlyRevenue(monthly);

    // Fetch yearly revenue
    const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
    const endOfYear = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59);

    const { data: yearlyData } = await supabase
      .from("sessions")
      .select("final_amount")
      .gte("created_at", startOfYear.toISOString())
      .lte("created_at", endOfYear.toISOString())
      .eq("status", "COMPLETED");

    const yearly = yearlyData?.reduce((sum, s) => sum + (s.final_amount || 0), 0) || 0;
    setYearlyRevenue(yearly);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-orbitron text-gradient-ps5">
          The CueStation
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {user?.username} ({user?.role})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Month Picker */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-4 bg-card px-6 py-3 rounded-lg border border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-orbitron text-lg">
            {formatMonth(selectedDate)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RevenueCard
            title="Revenue"
            monthlyAmount={monthlyRevenue}
            yearlyAmount={yearlyRevenue}
          />
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-orbitron">
                Daily Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousDay}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedDate)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextDay}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-4xl font-orbitron text-center text-secondary">
                ₹{dailyRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Breakdown */}
        <PaymentBreakdown selectedDate={selectedDate} />

        {/* Insights Grid */}
        <InsightsGrid selectedDate={selectedDate} />
      </div>
    </div>
  );
};

export default AdminDashboard;
