import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RevenueCardProps {
  title: string;
  monthlyAmount: number;
  yearlyAmount: number;
}

const RevenueCard = ({ title, monthlyAmount, yearlyAmount }: RevenueCardProps) => {
  const [showMonthly, setShowMonthly] = useState(true);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-orbitron">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMonthly(!showMonthly)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {showMonthly ? "Monthly" : "Yearly"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMonthly(!showMonthly)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-4xl font-orbitron text-center text-primary">
          ₹{(showMonthly ? monthlyAmount : yearlyAmount).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default RevenueCard;
