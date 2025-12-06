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
import { ChannelStatistics } from "@/services/api";

interface FraudByTypeChartProps {
  channelStats?: ChannelStatistics[];
}

export const FraudByTypeChart = ({ channelStats }: FraudByTypeChartProps) => {
  // No mock data - use only real channel statistics from API
  if (!channelStats || channelStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fraud by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No channel data available
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const data = channelStats.map(stat => {
    const fraudCount = Math.floor((stat as any).fraud_count ?? (stat.total * stat.fraud_rate / 100));
    const legitCount = Math.max(0, stat.total - fraudCount);
    return {
      type: stat.channel,
      fraudRate: parseFloat(stat.fraud_rate.toFixed(1)),
      fraudCount,
      legitimateCount: legitCount,
      count: stat.total,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data} margin={{ top: 8, right: 24, left: 88, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" />
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
            />
            <Legend />
            <Bar dataKey="fraudCount" fill="hsl(var(--destructive))" name="Fraud" stackId="a" />
            <Bar dataKey="legitimateCount" fill="hsl(var(--success))" name="Legitimate" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
