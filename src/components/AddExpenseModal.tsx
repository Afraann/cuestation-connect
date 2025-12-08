import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Loader2, Receipt, X } from "lucide-react";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded?: () => void;
}

const AddExpenseModal = ({
  open,
  onOpenChange,
  onExpenseAdded,
}: AddExpenseModalProps) => {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("expenses").insert({
        description,
        amount: parseFloat(amount),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Expense recorded");
      setDescription("");
      setAmount("");
      onOpenChange(false);
      if (onExpenseAdded) onExpenseAdded();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs bg-[#0f1115] border border-white/10 p-0 gap-0 shadow-2xl [&>button]:hidden">
        
        <DialogHeader className="p-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-orbitron text-base flex items-center gap-2 text-foreground">
            <Receipt className="h-4 w-4 text-amber-500" />
            <span>Record Expense</span>
          </DialogTitle>
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
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Description</Label>
            <Input
              placeholder="e.g. Stock Refill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/20 border-white/10 h-10 text-sm focus-visible:ring-amber-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Amount (₹)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-black/20 border-white/10 h-10 text-sm font-mono focus-visible:ring-amber-500/50"
            />
          </div>
          
          <div className="pt-2 flex gap-3">
             <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
             >
                Cancel
             </Button>
             <Button 
                className="flex-[2] h-10 font-orbitron text-xs font-bold tracking-wide bg-gradient-to-r from-amber-600 to-orange-600 hover:scale-[1.02] transition-transform shadow-lg text-white border-0" 
                onClick={handleSubmit}
                disabled={loading}
             >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;