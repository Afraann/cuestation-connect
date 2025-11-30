import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Smartphone, IndianRupee } from "lucide-react";

interface DailyStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DailyStatsModal = ({ open, onOpenChange }: DailyStatsModalProps) => {
  const [dailyCash, setDailyCash] = useState(0);
  const [dailyUpi, setDailyUpi] = useState(0);
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

    const { data } = await supabase
      .from("sessions")
      .select("amount_cash, amount_upi, final_amount, payment_method")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .eq("status", "COMPLETED");

    let cash = 0;
    let upi = 0;

    data?.forEach((session) => {
      if (session.payment_method === "CASH") {
        cash += session.final_amount || 0;
      } else if (session.payment_method === "UPI") {
        upi += session.final_amount || 0;
      } else if (session.payment_method === "SPLIT") {
        cash += session.amount_cash || 0;
        upi += session.amount_upi || 0;
      } else {
          // Fallback logic if needed, similar to Admin Dashboard
          // Assuming CASH default if not specified, or handle as per business logic
          // For now, let's stick to explicit types to avoid confusion
          // If legacy data exists without payment_method, it might be ignored or need handling
          if (!session.payment_method) {
             cash += session.final_amount || 0; // Default to cash for old records?
          }
      }
    });

    setDailyCash(cash);
    setDailyUpi(upi);
    setLoading(false);
  };

  const total = dailyCash + dailyUpi;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-center">
            Today's Collection
            <span className="block text-sm text-muted-foreground font-sans font-normal mt-1">
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
          <div className="text-center">
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">
              Total Revenue
            </p>
            <p className="text-5xl font-black text-foreground tracking-tighter">
              ₹{total.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
              <div className="p-2 bg-emerald-500 text-white rounded-full">
                <Wallet size={20} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Cash
                </p>
                <p className="text-xl font-black text-emerald-700">
                  ₹{dailyCash.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
              <div className="p-2 bg-blue-500 text-white rounded-full">
                <Smartphone size={20} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  UPI
                </p>
                <p className="text-xl font-black text-blue-700">
                  ₹{dailyUpi.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyStatsModal;