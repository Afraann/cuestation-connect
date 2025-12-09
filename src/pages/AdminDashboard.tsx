import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LogOut, 
  Menu, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  ArrowRight, 
  BarChart3, 
  CreditCard, 
  Gamepad2, 
  ShoppingBag,
  FileText,
  Receipt,
  Package,
  Monitor,
  UserCircle,
  ChevronRight,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, YAxis } from "recharts";
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isAfter
} from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { WeekPicker } from "@/components/admin/WeekPicker";
import { MonthPicker } from "@/components/admin/MonthPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface DashboardStats {
  revenue: number;
  expenses: number;
  netProfit: number;
  cashInHand: number;
  incomeSplit: { name: string; value: number; color: string }[];
  paymentSplit: { name: string; value: number; color: string }[];
  topDevices: { name: string; revenue: number }[];
  topItems: { name: string; count: number; revenue: number }[];
  trendData: { date: string; revenue: number; expenses: number }[];
}

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // -- STATE --
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Business Constraint
  const BUSINESS_START_DATE = new Date(2025, 10, 28); // Nov 28, 2025

  useEffect(() => {
    fetchDashboardData();
  }, [currentDate, view]);

  const fetchDashboardData = async () => {
    setLoading(true);

    // 1. Calculate Date Range
    let startDate: Date;
    let endDate: Date;

    if (view === "daily") {
      startDate = startOfDay(currentDate);
      endDate = endOfDay(currentDate);
    } else if (view === "weekly") {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    }

    // 2. Fetch Data
    const { data: sessions } = await supabase
      .from("sessions")
      .select("created_at, final_amount, amount_cash, amount_upi, devices(name)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .eq("status", "COMPLETED");

    const { data: sales } = await supabase
      .from("direct_sales")
      .select("created_at, total_amount, amount_cash, amount_upi, items")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    const { data: expenses } = await supabase
      .from("expenses")
      .select("created_at, amount")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    const { data: sessionItems } = await supabase
      .from("session_items")
      .select("quantity, price_at_order, products(id, name)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, price");

    // Create a Product Lookup Map for Direct Sales
    const productLookup = new Map<string, { name: string; price: number }>();
    allProducts?.forEach(p => productLookup.set(p.id, { name: p.name, price: p.price }));

    // 3. Process Data
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalSessionRev = 0;
    let totalSalesRev = 0;
    let totalCashIn = 0;
    let totalUpiIn = 0;

    const deviceMap: Record<string, number> = {};
    const trendMap: Record<string, { revenue: number; expenses: number }> = {};
    const itemMap: Record<string, { count: number; revenue: number }> = {};
    
    // Trend Logic: Clamp end date to NOW to avoid future dates in charts
    const now = new Date();
    const trendEndDate = isAfter(endDate, now) ? now : endDate;
    
    // Only generate buckets if start date is not in future
    if (!isAfter(startDate, now)) {
      const safeEndDate = isAfter(startDate, trendEndDate) ? startDate : trendEndDate;
      const daysInterval = eachDayOfInterval({ start: startDate, end: safeEndDate });
      daysInterval.forEach(day => {
        trendMap[format(day, "MMM dd")] = { revenue: 0, expenses: 0 };
      });
    }

    // Process Sessions
    sessions?.forEach(s => {
      const amt = s.final_amount || 0;
      totalRevenue += amt;
      totalSessionRev += amt;
      totalCashIn += s.amount_cash || 0;
      totalUpiIn += s.amount_upi || 0;
      
      const devName = s.devices?.name || "Unknown";
      deviceMap[devName] = (deviceMap[devName] || 0) + amt;

      const dayKey = format(new Date(s.created_at), "MMM dd");
      if (trendMap[dayKey]) trendMap[dayKey].revenue += amt;
    });

    // Process Direct Sales
    sales?.forEach(s => {
      const amt = s.total_amount || 0;
      totalRevenue += amt;
      totalSalesRev += amt;
      totalCashIn += s.amount_cash || 0;
      totalUpiIn += s.amount_upi || 0;

      const dayKey = format(new Date(s.created_at), "MMM dd");
      if (trendMap[dayKey]) trendMap[dayKey].revenue += amt;

      // Process Direct Sale Items
      const cart = s.items as Record<string, number>;
      if (cart) {
        Object.entries(cart).forEach(([pid, qty]) => {
          const product = productLookup.get(pid);
          const name = product?.name || "Unknown Item";
          const price = product?.price || 0;
          
          if (!itemMap[name]) itemMap[name] = { count: 0, revenue: 0 };
          itemMap[name].count += qty;
          itemMap[name].revenue += qty * price;
        });
      }
    });

    // Process Session Items
    sessionItems?.forEach(item => {
       const name = item.products?.name || "Unknown Item";
       const rev = item.quantity * item.price_at_order;
       
       if (!itemMap[name]) itemMap[name] = { count: 0, revenue: 0 };
       itemMap[name].count += item.quantity;
       itemMap[name].revenue += rev;
    });

    // Process Expenses
    expenses?.forEach(e => {
      const amt = e.amount || 0;
      totalExpenses += amt;

      const dayKey = format(new Date(e.created_at), "MMM dd");
      if (trendMap[dayKey]) trendMap[dayKey].expenses += amt;
    });

    const trendData = Object.entries(trendMap).map(([date, vals]) => ({
      date,
      ...vals
    }));

    const topDevices = Object.entries(deviceMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topItems = Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setStats({
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      cashInHand: totalCashIn - totalExpenses,
      incomeSplit: [
        { name: "Gaming", value: totalSessionRev, color: "#3b82f6" }, // Blue
        { name: "Retail", value: totalSalesRev, color: "#10b981" },   // Emerald
      ],
      paymentSplit: [
        { name: "Cash", value: totalCashIn, color: "#f59e0b" }, // Amber
        { name: "UPI", value: totalUpiIn, color: "#8b5cf6" },   // Purple
      ],
      topDevices,
      topItems,
      trendData
    });

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-3 pb-20 md:p-6 lg:p-8 flex flex-col space-y-4 md:space-y-6 overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0f1115]/80 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/5 shadow-lg gap-3">
        <div className="flex items-center gap-3">
           <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <img src="/logo.jpg" className="h-full w-full object-cover rounded-lg opacity-90" alt="Logo" />
           </div>
           <div>
              <h1 className="text-lg md:text-2xl font-orbitron font-bold tracking-wide text-foreground">DASHBOARD</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
                {view === 'daily' ? format(currentDate, "MMMM d, yyyy") : "Overview"}
              </p>
           </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as "daily" | "weekly" | "monthly")} className="w-full md:w-auto">
            <TabsList className="bg-[#0f1115] border border-white/10 w-full md:w-auto grid grid-cols-3 md:flex">
              <TabsTrigger value="daily" className="text-[10px] md:text-xs font-orbitron">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-[10px] md:text-xs font-orbitron">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-[10px] md:text-xs font-orbitron">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 md:flex-none min-w-[140px]">
            {view === "daily" && (
              <DatePicker 
                date={currentDate} 
                setDate={(d) => d && setCurrentDate(d)} 
                className="w-full bg-[#0f1115] border-white/10 text-white hover:bg-white/5 text-xs h-9"
              />
            )}
            {view === "weekly" && (
              <WeekPicker 
                date={currentDate} 
                setDate={setCurrentDate} 
                minDate={BUSINESS_START_DATE}
                className="w-full"
              />
            )}
            {view === "monthly" && (
              <MonthPicker 
                date={currentDate} 
                setDate={setCurrentDate} 
                minDate={BUSINESS_START_DATE}
                className="w-full"
              />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-white/5 shrink-0">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 bg-[#0f1115] border-white/10">
              
              {/* User Profile Snippet */}
              <div className="flex items-center gap-3 p-2 mb-2 rounded-lg bg-white/5 border border-white/5">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center border border-white/10">
                   <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                   <span className="text-sm font-bold truncate text-foreground">Admin</span>
                   <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Access Granted</span>
                </div>
              </div>

              {/* Records Section */}
              <DropdownMenuLabel className="px-2 text-xs text-muted-foreground uppercase tracking-widest mt-2">Records</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/admin/sessions")} className="gap-3 group cursor-pointer">
                <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span>Session Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/expenses")} className="gap-3 group cursor-pointer">
                <div className="h-6 w-6 rounded bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <span>Expense Sheet</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/direct-sales")} className="gap-3 group cursor-pointer">
                <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
                <span>Item Sales</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />

              {/* Management Section */}
              <DropdownMenuLabel className="px-2 text-xs text-muted-foreground uppercase tracking-widest">Management</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-3 group cursor-pointer">
                <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Package className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1">Inventory Management</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => toast("Feature Coming Soon", { description: "Advanced device management is under development." })} 
                className="gap-3 group cursor-pointer"
              >
                <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-muted-foreground group-hover:text-foreground">Device Management</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />
              
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 gap-3 cursor-pointer">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* --- SECTION A: EXECUTIVE HUD --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Net Profit */}
        <Card className="bg-[#0f1115] border-white/10 shadow-xl overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="h-10 w-10 md:h-16 md:w-16 text-emerald-500" />
           </div>
           <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Net Profit
              </CardTitle>
           </CardHeader>
           <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="text-xl md:text-3xl font-black font-orbitron text-emerald-400">
                ₹{stats?.netProfit.toLocaleString() ?? "0"}
              </div>
           </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-[#0f1115] border-white/10 shadow-xl relative group">
           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="h-10 w-10 md:h-16 md:w-16 text-blue-500" />
           </div>
           <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Revenue</CardTitle>
           </CardHeader>
           <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="text-xl md:text-3xl font-black font-orbitron text-white">
                ₹{stats?.revenue.toLocaleString() ?? "0"}
              </div>
           </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="bg-[#0f1115] border-white/10 shadow-xl relative group">
           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown className="h-10 w-10 md:h-16 md:w-16 text-red-500" />
           </div>
           <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Expenses</CardTitle>
           </CardHeader>
           <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="text-xl md:text-3xl font-black font-orbitron text-red-400">
                ₹{stats?.expenses.toLocaleString() ?? "0"}
              </div>
           </CardContent>
        </Card>

        {/* Cash in Hand */}
        <Card className="bg-[#0f1115] border-white/10 shadow-xl relative group">
           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="h-10 w-10 md:h-16 md:w-16 text-amber-500" />
           </div>
           <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Cash Drawer</CardTitle>
           </CardHeader>
           <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="text-xl md:text-3xl font-black font-orbitron text-amber-400">
                ₹{stats?.cashInHand.toLocaleString() ?? "0"}
              </div>
           </CardContent>
        </Card>
      </div>

      {/* --- SECTION B: ANALYTICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-full">
        
        {/* LEFT COL: Trend Chart (Hidden on Daily) */}
        {view !== 'daily' && (
          <div className="lg:col-span-2">
            <Card className="bg-[#0f1115] border-white/10 shadow-xl h-[300px] md:h-[400px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-orbitron">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] md:h-[320px] w-full pl-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.trendData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#aaa', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="In" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Out" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Breakdown Grid */}
        <div className={view !== 'daily' ? "lg:col-span-1 space-y-4" : "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
             
           {/* 1. Income Split */}
           <Card className="bg-[#0f1115] border-white/10 shadow-xl h-[320px]">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-orbitron flex items-center gap-2">
                 <BarChart3 className="h-4 w-4" /> Income Source
               </CardTitle>
             </CardHeader>
             <CardContent className="h-[240px] flex items-center justify-center relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={stats?.incomeSplit}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {stats?.incomeSplit.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff20', borderRadius: '8px' }} 
                      itemStyle={{ color: '#fff' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-2 text-[10px] text-blue-400 font-bold"><div className="w-2 h-2 bg-blue-500 rounded-full" /> Gaming</div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Retail</div>
               </div>
             </CardContent>
           </Card>

           {/* 2. Payment Split */}
           <Card className="bg-[#0f1115] border-white/10 shadow-xl h-[320px]">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-orbitron flex items-center gap-2">
                 <CreditCard className="h-4 w-4" /> Payment Mode
               </CardTitle>
             </CardHeader>
             <CardContent className="h-[240px] flex items-center justify-center relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={stats?.paymentSplit}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {stats?.paymentSplit.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff20', borderRadius: '8px' }} 
                      itemStyle={{ color: '#fff' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold"><div className="w-2 h-2 bg-amber-500 rounded-full" /> Cash</div>
                  <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold"><div className="w-2 h-2 bg-purple-500 rounded-full" /> UPI</div>
               </div>
             </CardContent>
           </Card>

           {/* 3. Top Devices */}
           <Card className="bg-[#0f1115] border-white/10 shadow-xl h-[320px] overflow-hidden">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-orbitron flex items-center gap-2">
                 <Gamepad2 className="h-4 w-4" /> Top Devices
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 pt-4">
               {stats?.topDevices.map((device, i) => (
                 <div key={device.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-mono text-muted-foreground/50">0{i+1}</span>
                       <span className="text-xs font-bold text-foreground">{device.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(device.revenue / (stats?.topDevices[0].revenue || 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-blue-400 w-12 text-right">₹{device.revenue.toLocaleString()}</span>
                    </div>
                 </div>
               ))}
             </CardContent>
           </Card>

           {/* 4. Top Items */}
           <Card className="bg-[#0f1115] border-white/10 shadow-xl h-[320px] overflow-hidden">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest font-orbitron flex items-center gap-2">
                 <ShoppingBag className="h-4 w-4" /> Top Items
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 pt-4">
               {stats?.topItems.map((item, i) => (
                 <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-mono text-muted-foreground/50">0{i+1}</span>
                       <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{item.name}</span>
                       <span className="text-[9px] text-muted-foreground">x{item.count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(item.revenue / (stats?.topItems[0].revenue || 1)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 w-12 text-right">₹{item.revenue.toLocaleString()}</span>
                    </div>
                 </div>
               ))}
             </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;