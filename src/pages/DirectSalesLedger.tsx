import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  max,
  min,
  format,
} from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { WeekPicker } from "@/components/admin/WeekPicker";
import { MonthPicker } from "@/components/admin/MonthPicker";
import { ArrowLeft, Download, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface DirectSaleData {
  id: string;
  payment_method: string;
  total_amount: number;
  amount_cash: number;
  amount_upi: number;
  items: Record<string, number>; // JSONB: { "product_id": quantity }
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

const DirectSalesLedger = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [sales, setSales] = useState<DirectSaleData[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Business Constraints
  const businessStartDate = new Date(2025, 10, 28);
  const today = new Date();

  // Calculate DateRange
  const dateRange: DateRange | undefined = useMemo(() => {
    let from: Date;
    let to: Date;

    if (view === "daily") {
      from = currentDate;
      to = currentDate;
    } else if (view === "weekly") {
      from = max([startOfWeek(currentDate, { weekStartsOn: 0 }), businessStartDate]);
      to = min([endOfWeek(currentDate, { weekStartsOn: 0 }), today]);
    } else {
      from = max([startOfMonth(currentDate), businessStartDate]);
      to = min([endOfMonth(currentDate), today]);
    }

    return { from, to };
  }, [currentDate, view]);

  // 1. Fetch Products Mapping (ID -> Name) once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from("products").select("id, name");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p) => (map[p.id] = p.name));
        setProductsMap(map);
      }
    };
    fetchProducts();
  }, []);

  // 2. Fetch Sales when date changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchSales();
    }
  }, [dateRange]);

  const fetchSales = async () => {
    setLoading(true);
    if (!dateRange?.from || !dateRange?.to) return;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("direct_sales")
      .select("*")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching direct sales:", error);
      toast.error("Failed to load sales");
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  const handleDownloadCsv = () => {
    if (!sales.length) {
      toast.error("No data to download");
      return;
    }

    const headers = [
      "Sl. No",
      "Date",
      "Time",
      "Items",
      "Payment Mode",
      "Total Amount",
    ];

    const csvData = sales.map((sale, index) => {
      // Format items string
      const itemString = Object.entries(sale.items || {})
        .map(([id, qty]) => `${productsMap[id] || 'Unknown'} x${qty}`)
        .join("; ");

      return [
        index + 1,
        format(new Date(sale.created_at), "yyyy-MM-dd"),
        format(new Date(sale.created_at), "hh:mm a"),
        itemString,
        sale.payment_method,
        sale.total_amount,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `counter_sales_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) setCurrentDate(date);
  };

  const getRangeText = () => {
    if (!dateRange?.from || !dateRange?.to) return "";
    if (view === "daily") return format(dateRange.from, "MMMM d, yyyy");
    return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-orbitron text-gradient-ps5">Counter Sales</h1>
            <p className="text-sm text-muted-foreground">
              {getRangeText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button onClick={handleDownloadCsv} variant="outline" className="gap-2 w-full md:w-auto">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-card border border-border/50 p-4 rounded-xl">
        <Tabs 
          defaultValue="daily" 
          value={view} 
          onValueChange={(v) => setView(v as "daily" | "weekly" | "monthly")}
          className="w-full md:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-[300px]">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full md:w-auto flex justify-center">
          {view === "daily" && (
            <DatePicker 
              date={currentDate} 
              setDate={handleDateChange} 
              className="w-full md:w-[260px]"
            />
          )}
          {view === "weekly" && (
            <WeekPicker 
              date={currentDate} 
              setDate={setCurrentDate}
              minDate={businessStartDate}
              maxDate={today}
              className="w-full md:w-[260px]"
            />
          )}
          {view === "monthly" && (
            <MonthPicker 
              date={currentDate} 
              setDate={setCurrentDate}
              minDate={businessStartDate}
              maxDate={today}
              className="w-full md:w-[260px]"
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sales.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p>No counter sales found for this period</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px]">No.</TableHead>
                  <TableHead className="w-[120px]">Time</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="w-[100px]">Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale, index) => (
                  <TableRow key={sale.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground text-xs">
                      {(index + 1).toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(sale.created_at), "h:mm a")}
                      <span className="block text-[10px] text-muted-foreground">
                        {format(new Date(sale.created_at), "MMM d")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sale.items || {}).map(([id, qty]) => (
                          <span key={id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/10 text-secondary border border-secondary/20">
                            {productsMap[id] || 'Item'} x{qty}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        sale.payment_method === 'CASH' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        sale.payment_method === 'UPI' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{sale.total_amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectSalesLedger;