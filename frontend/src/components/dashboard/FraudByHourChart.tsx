import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Transaction {
  date: string;
  transaction_date?: string;
  isFraud: boolean;
}

interface FraudByHourChartProps {
  transactions: Transaction[];
}

export const FraudByHourChart = ({ transactions }: FraudByHourChartProps) => {
  // Generate hourly data from transactions
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourTransactions = transactions.filter(txn => {
      const dateStr = txn.transaction_date || txn.date;
      if (!dateStr) return false;
      try {
        const date = new Date(dateStr);
        return date.getHours() === hour;
      } catch {
        return false;
      }
    });

    const fraudCount = hourTransactions.filter(t => t.isFraud).length;
    const legitimateCount = hourTransactions.length - fraudCount;
    const total = hourTransactions.length;
    const fraudRate = total > 0 ? (fraudCount / total) * 100 : 0;

    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      hourNum: hour,
      fraud: fraudCount,
      legitimate: legitimateCount,
      total,
      fraudRate: parseFloat(fraudRate.toFixed(1)),
    };
  });

  // Check if we have real data
  const hasData = hourlyData.some(h => h.total > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fraud by Hour (24-Hour)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hourly transaction data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud by Hour (24-Hour)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={hourlyData} margin={{ top: 8, right: 24, left: 88, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10 }}
              interval={2}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: "Transaction Count",
                angle: -90,
                position: "insideLeft",
                dy: 0,
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number, name: string) => {
                if (name === "fraudRate") return [`${value}%`, "Fraud Rate"];
                return [value, name === "fraud" ? "Fraud" : "Legitimate"];
              }}
            />
            <Legend />
            <Bar
              dataKey="legitimate"
              fill="hsl(var(--success))"
              stackId="a"
              name="Legitimate"
            />
            <Bar
              dataKey="fraud"
              fill="hsl(var(--destructive))"
              stackId="a"
              name="Fraud"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
