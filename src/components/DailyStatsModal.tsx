import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Smartphone, Receipt, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DailyStatsModal = ({ open, onOpenChange }: DailyStatsModalProps) => {
  const [dailyCash, setDailyCash] = useState(0);
  const [dailyUpi, setDailyUpi] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDailyStats();
    }
  }, [open]);

  const fetchDailyStats = async () => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch Income
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("amount_cash, amount_upi, final_amount, payment_method")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .eq("status", "COMPLETED");

    let cash = 0;
    let upi = 0;

    sessionData?.forEach((session) => {
      if (session.payment_method === "CASH") {
        cash += session.final_amount || 0;
      } else if (session.payment_method === "UPI") {
        upi += session.final_amount || 0;
      } else if (session.payment_method === "SPLIT") {
        cash += session.amount_cash || 0;
        upi += session.amount_upi || 0;
      }
    });

    setDailyCash(cash);
    setDailyUpi(upi);

    // 2. Fetch Expenses
    const { data: expenseData } = await supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    const expenses = expenseData?.reduce((sum, item) => sum + item.amount, 0) || 0;
    setDailyExpenses(expenses);

    setLoading(false);
  };

  const totalRevenue = dailyCash + dailyUpi;
  const netCashInHand = dailyCash - dailyExpenses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-center text-xl text-gradient-ps5">
            Today's Collection
            <span className="block text-xs text-muted-foreground font-sans font-normal mt-1 tracking-wide">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Top Section: Net Cash in Hand */}
          <div className="relative overflow-hidden rounded-xl border border-secondary/30 bg-secondary/5 p-6 text-center shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Wallet className="w-16 h-16 text-secondary" />
            </div>
            
            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
              Net Cash In Drawer
            </p>
            <p className="text-5xl font-black font-orbitron text-secondary tracking-tight">
              ₹{netCashInHand.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              (Total Cash Received - Expenses)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cash Collected */}
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center gap-2 hover:border-secondary/30 transition-colors">
              <div className="p-2 bg-secondary/10 text-secondary rounded-full">
                <TrendingUp size={18} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Cash Revenue
                </p>
                <p className="text-xl font-bold font-orbitron text-foreground">
                  ₹{dailyCash.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Expenses */}
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center gap-2 hover:border-destructive/30 transition-colors">
              <div className="p-2 bg-destructive/10 text-destructive rounded-full">
                <Receipt size={18} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Expenses
                </p>
                <p className="text-xl font-bold font-orbitron text-destructive">
                  - ₹{dailyExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Stats: Total Revenue & UPI */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
             <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                <p className="font-bold font-orbitron text-lg text-foreground">₹{totalRevenue.toLocaleString()}</p>
             </div>
             <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                  <Smartphone className="w-3 h-3" /> UPI
                </p>
                <p className="font-bold font-orbitron text-lg text-primary">₹{dailyUpi.toLocaleString()}</p>
             </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyStatsModal;