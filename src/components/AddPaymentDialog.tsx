import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet, Smartphone, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  method: "CASH" | "UPI";
}

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onPaymentSaved: () => void;
  balanceDue: number;
  paymentToEdit?: Payment | null; // New prop for editing
}

const AddPaymentDialog = ({
  open,
  onOpenChange,
  sessionId,
  onPaymentSaved,
  balanceDue,
  paymentToEdit,
}: AddPaymentDialogProps) => {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"CASH" | "UPI" | null>(null);
  const [loading, setLoading] = useState(false);

  // Load data when opening for edit
  useEffect(() => {
    if (open && paymentToEdit) {
      setAmount(paymentToEdit.amount.toString());
      setMethod(paymentToEdit.method);
    } else if (open) {
      setAmount("");
      setMethod(null);
    }
  }, [open, paymentToEdit]);

  const handleSubmit = async () => {
    if (!amount || !method) {
      toast.error("Please select amount and method");
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setLoading(true);

    let error;

    if (paymentToEdit) {
      // UPDATE existing payment
      const { error: updateError } = await supabase
        .from("session_payments")
        .update({ amount: amountNum, method: method })
        .eq("id", paymentToEdit.id);
      error = updateError;
    } else {
      // INSERT new payment
      const { error: insertError } = await supabase
        .from("session_payments")
        .insert({
          session_id: sessionId,
          amount: amountNum,
          method: method,
        });
      error = insertError;
    }

    if (error) {
      toast.error(paymentToEdit ? "Failed to update payment" : "Failed to record payment");
      console.error(error);
    } else {
      toast.success(paymentToEdit ? "Payment updated" : "Deposit recorded");
      onPaymentSaved();
      onOpenChange(false);
    }
    setLoading(false);
  };

  // Calculate max allowable amount
  // If editing, we add the current payment amount back to the balance "room"
  const maxAllowable = balanceDue + (paymentToEdit ? paymentToEdit.amount : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs p-4 gap-4">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-center">
            {paymentToEdit ? "Edit Payment" : "Add Deposit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (Max: ₹{maxAllowable})</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 200"
              className="font-mono text-lg"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={method === "CASH" ? "default" : "outline"}
              onClick={() => setMethod("CASH")}
              className={cn("h-12 gap-2", method === "CASH" && "ring-2 ring-primary")}
            >
              <Wallet className="h-4 w-4" /> Cash
            </Button>
            <Button
              variant={method === "UPI" ? "default" : "outline"}
              onClick={() => setMethod("UPI")}
              className={cn("h-12 gap-2", method === "UPI" && "ring-2 ring-primary")}
            >
              <Smartphone className="h-4 w-4" /> UPI
            </Button>
          </div>

          <Button 
            className="w-full h-10 font-orbitron" 
            onClick={handleSubmit}
            disabled={loading || !amount || !method}
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (paymentToEdit ? "Save Changes" : "Confirm Deposit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;