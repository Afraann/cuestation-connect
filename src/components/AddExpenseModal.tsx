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
import { Loader2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-orbitron">Record Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="e.g. Cleaning Supplies, Milk"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button 
            className="w-full h-12 font-orbitron text-lg" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;