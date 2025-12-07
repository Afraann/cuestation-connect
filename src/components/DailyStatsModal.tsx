import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Smartphone, Receipt, TrendingUp, DollarSign } from "lucide-react";

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

    // 1. Fetch Session Income
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

    // 2. Fetch Direct Sales Income (NEW)
    const { data: directSalesData } = await supabase
      .from("direct_sales")
      .select("amount_cash, amount_upi, total_amount, payment_method")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    directSalesData?.forEach((sale) => {
      // Direct sales table already has explicit cash/upi columns populated
      cash += sale.amount_cash || 0;
      upi += sale.amount_upi || 0;
    });

    setDailyCash(cash);
    setDailyUpi(upi);

    // 3. Fetch Expenses
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
      <DialogContent className="sm:max-w-sm bg-card border-border shadow-2xl p-4 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-orbitron text-center text-lg text-foreground">
            Daily Collection
          </DialogTitle>
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-wider">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
        </DialogHeader>

        <div className="space-y-2">
          
          {/* 1. TOP: Total Revenue */}
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-center">
             <div className="flex items-center justify-center gap-1.5 mb-1 text-primary">
               <DollarSign className="w-3 h-3" />
               <p className="text-[10px] font-bold uppercase tracking-widest">
                 Total Revenue
               </p>
             </div>
             <p className="text-2xl font-black font-orbitron text-foreground tracking-tight">
               ₹{totalRevenue.toLocaleString()}
             </p>
          </div>

          {/* 2. MIDDLE: Split (Cash vs UPI) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Cash Collected */}
            <div className="rounded-md border border-border bg-card p-2 flex flex-col items-center justify-center gap-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Cash
              </p>
              <p className="text-lg font-bold font-orbitron text-secondary">
                ₹{dailyCash.toLocaleString()}
              </p>
            </div>

            {/* UPI Collected */}
            <div className="rounded-md border border-border bg-card p-2 flex flex-col items-center justify-center gap-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> UPI
              </p>
              <p className="text-lg font-bold font-orbitron text-blue-400">
                ₹{dailyUpi.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 3. LOWER MIDDLE: Net Cash In Drawer */}
          <div className="rounded-md border border-secondary/20 bg-secondary/5 p-2 px-3 flex items-center justify-between">
             <div className="flex flex-col">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                   <TrendingUp className="w-3 h-3" /> Net Cash
                </p>
                <p className="text-[9px] text-muted-foreground">
                  (In Drawer)
                </p>
             </div>
             <p className="text-xl font-black font-orbitron text-secondary">
               ₹{netCashInHand.toLocaleString()}
             </p>
          </div>

          {/* 4. BOTTOM: Expenses */}
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 px-3 flex items-center justify-between">
             <p className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3 h-3" /> Expenses
             </p>
             <p className="text-lg font-bold font-orbitron text-destructive">
               - ₹{dailyExpenses.toLocaleString()}
             </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyStatsModal;