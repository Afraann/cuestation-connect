import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Smartphone, Receipt, TrendingUp, DollarSign, X } from "lucide-react";
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

    // 2. Fetch Direct Sales Income
    const { data: directSalesData } = await supabase
      .from("direct_sales")
      .select("amount_cash, amount_upi, total_amount, payment_method")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    directSalesData?.forEach((sale) => {
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
      <DialogContent className="sm:max-w-sm bg-[#0f1115] border border-white/10 p-0 gap-0 shadow-2xl [&>button]:hidden">
        
        {/* Header */}
        <DialogHeader className="p-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="font-orbitron text-lg text-foreground tracking-wide">
              Daily Report
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 text-muted-foreground hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="p-5 space-y-4">
          
          {/* 1. TOP: Total Revenue */}
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-blue-600/5 p-4 text-center group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500 opacity-50" />
             <div className="flex items-center justify-center gap-1.5 mb-1 text-primary-foreground/80">
               <DollarSign className="w-3.5 h-3.5 text-primary" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                 Total Revenue
               </p>
             </div>
             <p className="text-3xl font-black font-orbitron text-white tracking-tight group-hover:scale-105 transition-transform duration-300">
               ₹{totalRevenue.toLocaleString()}
             </p>
          </div>

          {/* 2. MIDDLE: Split (Cash vs UPI) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cash Collected */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3 h-3 text-emerald-400" /> Cash
              </p>
              <p className="text-xl font-bold font-orbitron text-emerald-400">
                ₹{dailyCash.toLocaleString()}
              </p>
            </div>

            {/* UPI Collected */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-blue-400" /> UPI
              </p>
              <p className="text-xl font-bold font-orbitron text-blue-400">
                ₹{dailyUpi.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 3. Expenses */}
          <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 px-4 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-red-500/10 text-red-400">
                   <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-red-400/80 uppercase tracking-wider">Expenses</span>
             </div>
             <p className="text-lg font-bold font-orbitron text-red-400">
               - ₹{dailyExpenses.toLocaleString()}
             </p>
          </div>

          {/* 4. LOWER MIDDLE: Net Cash In Drawer */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 flex items-center justify-between shadow-inner">
             <div className="flex flex-col">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                   <TrendingUp className="w-3.5 h-3.5 text-white" /> Net Cash
                </p>
                <p className="text-[9px] text-muted-foreground/50 pl-5">
                  (In Drawer)
                </p>
             </div>
             <p className="text-2xl font-black font-orbitron text-white">
               ₹{netCashInHand.toLocaleString()}
             </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyStatsModal;