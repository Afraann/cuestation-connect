import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentBreakdownProps {
  selectedDate: Date;
}

const PaymentBreakdown = ({ selectedDate }: PaymentBreakdownProps) => {
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);

  useEffect(() => {
    fetchPaymentBreakdown();
  }, [selectedDate]);

  const fetchPaymentBreakdown = async () => {
    const startOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const { data } = await supabase
      .from("sessions")
      .select("amount_cash, amount_upi")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString())
      .eq("status", "COMPLETED");

    const cash = data?.reduce((sum, s) => sum + (s.amount_cash || 0), 0) || 0;
    const upi = data?.reduce((sum, s) => sum + (s.amount_upi || 0), 0) || 0;

    setCashAmount(cash);
    setUpiAmount(upi);
  };

  const total = cashAmount + upiAmount;
  const cashPercentage = total > 0 ? (cashAmount / total) * 100 : 0;
  const upiPercentage = total > 0 ? (upiAmount / total) * 100 : 0;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-orbitron">Payment Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex h-8 rounded-lg overflow-hidden">
            <div
              className="bg-billiard flex items-center justify-center text-xs font-medium"
              style={{ width: `${cashPercentage}%` }}
            >
              {cashPercentage > 15 && `${Math.round(cashPercentage)}%`}
            </div>
            <div
              className="bg-ps5 flex items-center justify-center text-xs font-medium"
              style={{ width: `${upiPercentage}%` }}
            >
              {upiPercentage > 15 && `${Math.round(upiPercentage)}%`}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-billiard" />
              <div>
                <p className="text-sm text-muted-foreground">Cash</p>
                <p className="font-orbitron">₹{cashAmount.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-ps5" />
              <div>
                <p className="text-sm text-muted-foreground">UPI</p>
                <p className="font-orbitron">₹{upiAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentBreakdown;
