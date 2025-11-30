import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

const ProductsSettings = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({ name: "", price: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
      return;
    }

    setProducts(data || []);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      price: newProduct.price,
      is_available: true,
    });

    if (error) {
      toast.error("Failed to add product");
      console.error(error);
    } else {
      toast.success("Product added");
      setNewProduct({ name: "", price: 0 });
      fetchProducts();
    }

    setLoading(false);
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ is_available: isAvailable })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update product");
    } else {
      toast.success("Product updated");
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Product */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-orbitron">Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                placeholder="e.g., Cola"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                value={newProduct.price || ""}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })
                }
                placeholder="30"
                className="bg-muted/50"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddProduct} disabled={loading} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product List */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-orbitron">Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{product.price}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`available-${product.id}`} className="text-sm">
                      Available
                    </Label>
                    <Switch
                      id={`available-${product.id}`}
                      checked={product.is_available}
                      onCheckedChange={(checked) =>
                        handleToggleAvailability(product.id, checked)
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsSettings;
