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
import { ArrowLeft, Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SessionData {
  id: string;
  device_id: string;
  start_time: string;
  end_time: string | null;
  payment_method: string | null;
  calculated_amount: number | null;
  final_amount: number | null;
  devices: {
    name: string;
  } | null;
}

const SessionLedger = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<SessionData[]>([]);
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
      fetchSessions();
    }
  }, [dateRange]);

  const fetchSessions = async () => {
    setLoading(true);
    if (!dateRange?.from || !dateRange?.to) return;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("sessions")
      .select(`
        *,
        devices (
          name
        )
      `)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .eq("status", "COMPLETED")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const handleDownloadCsv = () => {
    if (!sessions.length) {
      toast.error("No data to download");
      return;
    }

    const headers = [
      "Sl. No",
      "Device",
      "Start Time",
      "End Time",
      "Payment Mode",
      "Expected Amount",
      "Paid Amount",
    ];

    const csvData = sessions.map((session, index) => [
      index + 1,
      session.devices?.name || "Unknown",
      format(new Date(session.start_time), "dd/MM/yyyy hh:mm a"),
      session.end_time ? format(new Date(session.end_time), "dd/MM/yyyy hh:mm a") : "-",
      session.payment_method || "-",
      session.calculated_amount || 0,
      session.final_amount || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `session_ledger_${format(new Date(), "yyyy-MM-dd")}.csv`);
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
            <h1 className="text-2xl font-orbitron text-gradient-ps5">Session Details</h1>
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
        ) : sessions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <FileText className="h-10 w-10 opacity-20" />
            <p>No session records found for this period</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px]">Sl. No</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session, index) => {
                  const isMismatch = (session.final_amount || 0) !== (session.calculated_amount || 0);
                  
                  return (
                    <TableRow key={session.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-muted-foreground">
                        {(index + 1).toString().padStart(2, '0')}
                      </TableCell>
                      <TableCell className="font-orbitron text-primary">
                        {session.devices?.name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.start_time), "h:mm a")}
                      </TableCell>
                      <TableCell>
                        {session.end_time ? format(new Date(session.end_time), "h:mm a") : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          session.payment_method === 'CASH' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          session.payment_method === 'UPI' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        }`}>
                          {session.payment_method || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ₹{session.calculated_amount}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        isMismatch && "text-destructive"
                      )}>
                        ₹{session.final_amount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionLedger;