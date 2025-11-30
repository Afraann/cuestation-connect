import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueCardProps {
  title: string;
  amount: number;
}

const RevenueCard = ({ title, amount }: RevenueCardProps) => {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-orbitron">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-orbitron text-center text-primary">
          ₹{amount.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default RevenueCard;