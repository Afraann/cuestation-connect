import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightsGridProps {
  selectedDate: Date;
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

const InsightsGrid = ({ selectedDate }: InsightsGridProps) => {
  const [deviceRevenue, setDeviceRevenue] = useState<DeviceRevenue[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [groupSizes, setGroupSizes] = useState<any>({});

  useEffect(() => {
    fetchInsights();
  }, [selectedDate]);

  const fetchInsights = async () => {
    const startOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Device revenue
    const { data: sessions } = await supabase
      .from("sessions")
      .select("calculated_amount, devices(type)")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString())
      .eq("status", "COMPLETED");

    const revenueByType: Record<string, number> = {};
    sessions?.forEach((session: any) => {
      const type = session.devices?.type || "Unknown";
      revenueByType[type] = (revenueByType[type] || 0) + (session.calculated_amount || 0);
    });

    setDeviceRevenue(
      Object.entries(revenueByType).map(([type, revenue]) => ({ type, revenue }))
    );

    // Product sales
    const { data: items } = await supabase
      .from("session_items")
      .select("quantity, price_at_order, products(name), sessions!inner(created_at)")
      .gte("sessions.created_at", startOfMonth.toISOString())
      .lte("sessions.created_at", endOfMonth.toISOString());

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

    // Group sizes (mock data for now - would need rate_profile info)
    setGroupSizes({
      "1P": 45,
      "2P": 35,
      "3P": 15,
      "4P": 5,
    });
  };

  const totalDeviceRevenue = deviceRevenue.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Revenue Generator */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-orbitron">Revenue Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deviceRevenue.map((device) => (
              <div key={device.type} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      device.type === "PS5" ? "bg-ps5" : "bg-billiard"
                    }`}
                  />
                  <span className="text-sm">{device.type}</span>
                </div>
                <span className="font-orbitron text-sm">
                  ₹{device.revenue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Group Sizes */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-orbitron">Group Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(groupSizes).map(([size, percentage]) => {
              const pct = percentage as number;
              return (
                <div key={size} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{size}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Inventory */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-orbitron">Top Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {productSales.slice(0, 5).map((product, index) => (
              <div key={product.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>
                    {index + 1}. {product.name}
                  </span>
                  <span className="font-orbitron">
                    {product.quantity} sold
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary"
                    style={{
                      width: `${(product.quantity / (productSales[0]?.quantity || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsGrid;
