import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface FinancialSummaryProps {
  revenue: number;
  expenses: number;
}

const FinancialSummary = ({ revenue, expenses }: FinancialSummaryProps) => {
  const netProfit = revenue - expenses;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground font-orbitron">
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Revenue */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-3 w-3" />
              </div>
              Revenue
            </div>
            <p className="text-lg md:text-xl font-bold font-orbitron text-emerald-500">
              ₹{revenue.toLocaleString()}
            </p>
          </div>

          {/* Expenses */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="p-1 rounded-full bg-red-500/10 text-red-500">
                <TrendingDown className="h-3 w-3" />
              </div>
              Expenses
            </div>
            <p className="text-lg md:text-xl font-bold font-orbitron text-red-500">
              ₹{expenses.toLocaleString()}
            </p>
          </div>

          {/* Net Profit */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="p-1 rounded-full bg-blue-500/10 text-blue-500">
                <Wallet className="h-3 w-3" />
              </div>
              Net
            </div>
            <p className={`text-lg md:text-xl font-bold font-orbitron ${netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
              ₹{netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;