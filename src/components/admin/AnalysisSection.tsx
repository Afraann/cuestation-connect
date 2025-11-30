import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import RevenueCard from "@/components/admin/RevenueCard";
import PaymentBreakdown from "@/components/admin/PaymentBreakdown";
import InsightsGrid from "@/components/admin/InsightsGrid";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalysisSectionProps {
  title: string;
  dateRange: DateRange | undefined;
}

const AnalysisSection = ({ title, dateRange }: AnalysisSectionProps) => {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col gap-4 min-w-[300px] h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h2 className="text-xl font-orbitron text-primary tracking-wide">{title}</h2>
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