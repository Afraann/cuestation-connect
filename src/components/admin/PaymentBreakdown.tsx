import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";

interface PaymentBreakdownProps {
  dateRange: DateRange | undefined;
}

const PaymentBreakdown = ({ dateRange }: PaymentBreakdownProps) => {
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchPaymentBreakdown();
    }
  }, [dateRange]);

  const fetchPaymentBreakdown = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);

    // 1. Fetch Session Payments
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("amount_cash, amount_upi")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .eq("status", "COMPLETED");

    const sessionCash = sessionData?.reduce((sum, s) => sum + (s.amount_cash || 0), 0) || 0;
    const sessionUpi = sessionData?.reduce((sum, s) => sum + (s.amount_upi || 0), 0) || 0;

    // 2. Fetch Direct Sales Payments
    const { data: salesData } = await supabase
      .from("direct_sales")
      .select("amount_cash, amount_upi")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const salesCash = salesData?.reduce((sum, s) => sum + (s.amount_cash || 0), 0) || 0;
    const salesUpi = salesData?.reduce((sum, s) => sum + (s.amount_upi || 0), 0) || 0;

    setCashAmount(sessionCash + salesCash);
    setUpiAmount(sessionUpi + salesUpi);
  };

  const total = cashAmount + upiAmount;
  const cashPercentage = total > 0 ? (cashAmount / total) * 100 : 0;
  const upiPercentage = total > 0 ? (upiAmount / total) * 100 : 0;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-orbitron">Payment Split</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Visual Bar */}
          <div className="flex h-4 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-billiard flex items-center justify-center transition-all duration-500"
              style={{ width: `${cashPercentage}%` }}
            />
            <div
              className="bg-ps5 flex items-center justify-center transition-all duration-500"
              style={{ width: `${upiPercentage}%` }}
            />
          </div>

          {/* Legend */}
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-billiard" />
              <span className="text-muted-foreground">Cash:</span>
              <span className="font-semibold">₹{cashAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-ps5" />
              <span className="text-muted-foreground">UPI:</span>
              <span className="font-semibold">₹{upiAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentBreakdown;