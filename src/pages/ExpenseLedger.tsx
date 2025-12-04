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
import { ArrowLeft, Download, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  created_by: string; // UUID
  // Optional: Join with users table if you want to show username
  // users?: { username: string }
}

const ExpenseLedger = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(false);

  // Business Constraints
  const businessStartDate = new Date(2025, 10, 28); // Nov 28, 2025
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

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchExpenses();
    }
  }, [dateRange]);

  const fetchExpenses = async () => {
    setLoading(true);
    if (!dateRange?.from || !dateRange?.to) return;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const handleDownloadCsv = () => {
    if (!expenses.length) {
      toast.error("No data to download");
      return;
    }

    const headers = [
      "Sl. No",
      "Description",
      "Amount",
      "Date",
      "Time",
    ];

    const csvData = expenses.map((expense, index) => [
      index + 1,
      expense.description,
      expense.amount,
      format(new Date(expense.created_at), "yyyy-MM-dd"),
      format(new Date(expense.created_at), "hh:mm a"),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expense_ledger_${format(new Date(), "yyyy-MM-dd")}.csv`);
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
            <h1 className="text-2xl font-orbitron text-gradient-ps5">Expense Sheet</h1>
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
        ) : expenses.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Receipt className="h-10 w-10 opacity-20" />
            <p>No expenses recorded for this period</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px]">Sl. No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense, index) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">
                      {(index + 1).toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.created_at), "h:mm a")}
                    </TableCell>
                    <TableCell className="text-right font-orbitron text-destructive">
                      - ₹{expense.amount.toLocaleString()}
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

export default ExpenseLedger;