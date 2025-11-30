import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface AddItemPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onItemAdded: () => void;
}

const AddItemPopup = ({
  open,
  onOpenChange,
  sessionId,
  onItemAdded,
}: AddItemPopupProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
      return;
    }

    setProducts(data || []);
  };

  const handleAddItem = async (product: Product) => {
    setLoading(true);

    try {
      const { error } = await supabase.from("session_items").insert({
        session_id: sessionId,
        product_id: product.id,
        quantity: 1,
        price_at_order: product.price,
      });

      if (error) throw error;

      toast.success(`${product.name} added`);
      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-orbitron">Add Item</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <Button
              key={product.id}
              onClick={() => handleAddItem(product)}
              disabled={loading}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <span className="font-medium">{product.name}</span>
              <span className="text-sm text-muted-foreground">
                ₹{product.price}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemPopup;
