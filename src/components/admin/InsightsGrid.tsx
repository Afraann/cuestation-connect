import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";

interface InsightsGridProps {
  dateRange: DateRange | undefined;
}

interface DeviceRevenue {
  type: string;
  revenue: number;
}

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
}

const InsightsGrid = ({ dateRange }: InsightsGridProps) => {
  const [deviceRevenue, setDeviceRevenue] = useState<DeviceRevenue[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchInsights();
    }
  }, [dateRange]);

  const fetchInsights = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);

    // 1. Device revenue
    const { data: sessions } = await supabase
      .from("sessions")
      .select("calculated_amount, devices(type)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .eq("status", "COMPLETED");

    const revenueByType: Record<string, number> = {};
    sessions?.forEach((session: any) => {
      const type = session.devices?.type || "Unknown";
      revenueByType[type] = (revenueByType[type] || 0) + (session.calculated_amount || 0);
    });

    setDeviceRevenue(
      Object.entries(revenueByType)
        .map(([type, revenue]) => ({ type, revenue }))
        // Sort to ensure consistent order (e.g. Billiards first, or by revenue)
        .sort((a, b) => b.revenue - a.revenue)
    );

    // 2. Product sales
    const { data: items } = await supabase
      .from("session_items")
      .select("quantity, price_at_order, products(name), sessions!inner(created_at)")
      .gte("sessions.created_at", start.toISOString())
      .lte("sessions.created_at", end.toISOString());

    const salesByProduct: Record<string, { quantity: number; revenue: number }> = {};
    items?.forEach((item: any) => {
      const name = item.products?.name || "Unknown";
      if (!salesByProduct[name]) {
        salesByProduct[name] = { quantity: 0, revenue: 0 };
      }
      salesByProduct[name].quantity += item.quantity;
      salesByProduct[name].revenue += item.quantity * item.price_at_order;
    });

    setProductSales(
      Object.entries(salesByProduct)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
    );
  };

  // Calculate percentages for the Revenue By Type bar
  const totalRevenue = deviceRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const getPercentage = (amount: number) => totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;

  // Helper to assign specific colors to known types
  const getTypeColor = (type: string) => {
    if (type === "PS5") return "bg-ps5";
    if (type === "BILLIARDS") return "bg-billiard";
    return "bg-secondary";
  };

  return (
    <div className="space-y-4">
      {/* Revenue Generator */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground font-orbitron">Revenue by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Visual Bar - Segmented like PaymentBreakdown */}
            {deviceRevenue.length > 0 ? (
              <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                {deviceRevenue.map((device) => (
                  <div
                    key={device.type}
                    className={`${getTypeColor(device.type)} flex items-center justify-center transition-all duration-500`}
                    style={{ width: `${getPercentage(device.revenue)}%` }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-4 rounded-full bg-muted w-full" />
            )}

            {/* Legend / List */}
            {deviceRevenue.length > 0 ? (
              <div className="space-y-1">
                {deviceRevenue.map((device) => (
                  <div key={device.type} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getTypeColor(device.type)}`} />
                      <span className="text-muted-foreground">{device.type}</span>
                    </div>
                    <span className="font-semibold">
                      ₹{device.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No session data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Inventory */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground font-orbitron">Inventory Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {productSales.length > 0 ? (
              productSales.slice(0, 5).map((product, index) => (
                <div key={product.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-xs truncate max-w-[150px]">
                      {index + 1}. {product.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.quantity} sold
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(product.quantity / (productSales[0]?.quantity || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No sales data</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsGrid;