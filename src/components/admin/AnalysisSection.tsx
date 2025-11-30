import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  max, 
  min 
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import RevenueCard from "@/components/admin/RevenueCard";
import PaymentBreakdown from "@/components/admin/PaymentBreakdown";
import InsightsGrid from "@/components/admin/InsightsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { WeekPicker } from "@/components/admin/WeekPicker";
import { MonthPicker } from "@/components/admin/MonthPicker";

interface AnalysisSectionProps {
  title: string;
  variant: "daily" | "weekly" | "monthly";
}

const AnalysisSection = ({ title, variant }: AnalysisSectionProps) => {
  // Business Constraints
  const businessStartDate = new Date(2025, 10, 28); // Nov 28, 2025
  const today = new Date();

  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate the DateRange based on variant + currentDate + constraints
  const dateRange: DateRange | undefined = useMemo(() => {
    if (!currentDate) return undefined;

    let from: Date;
    let to: Date;

    if (variant === "daily") {
      from = currentDate;
      to = currentDate;
    } else if (variant === "weekly") {
      from = max([startOfWeek(currentDate, { weekStartsOn: 0 }), businessStartDate]);
      to = min([endOfWeek(currentDate, { weekStartsOn: 0 }), today]);
    } else {
      from = max([startOfMonth(currentDate), businessStartDate]);
      to = min([endOfMonth(currentDate), today]);
    }

    return { from, to };
  }, [currentDate, variant]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchRevenue();
    }
  }, [dateRange]);

  const fetchRevenue = async () => {
    setLoading(true);
    if (!dateRange?.from || !dateRange?.to) return;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("sessions")
      .select("final_amount")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .eq("status", "COMPLETED");

    const total = data?.reduce((sum, s) => sum + (s.final_amount || 0), 0) || 0;
    setRevenue(total);
    setLoading(false);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) setCurrentDate(date);
  };

  // Shared width class for all pickers to ensure they are exactly the same size
  const pickerClass = "w-[260px] shadow-sm";

  return (
    <div className="flex flex-col gap-4 min-w-[300px] h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 pb-2 border-b border-border/40">
        {/* Title: Hidden on Mobile, Visible on Desktop (md+) */}
        <h2 className="hidden md:block text-xl font-orbitron text-primary tracking-wide text-center">
          {title}
        </h2>
        
        {/* Picker Container: Always Centered */}
        <div className="flex justify-center w-full">
          {variant === "daily" && (
            <DatePicker 
              date={currentDate} 
              setDate={handleDateChange} 
              className={pickerClass}
            />
          )}
          {variant === "weekly" && (
            <WeekPicker 
              date={currentDate} 
              setDate={setCurrentDate}
              minDate={businessStartDate}
              maxDate={today}
              className={pickerClass}
            />
          )}
          {variant === "monthly" && (
            <MonthPicker 
              date={currentDate} 
              setDate={setCurrentDate}
              minDate={businessStartDate}
              maxDate={today}
              className={pickerClass}
            />
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (
        <RevenueCard title="Total Revenue" amount={revenue || 0} />
      )}

      <div className="flex-1 flex flex-col gap-4">
        <PaymentBreakdown dateRange={dateRange} />
        <InsightsGrid dateRange={dateRange} />
      </div>
    </div>
  );
};

export default AnalysisSection;