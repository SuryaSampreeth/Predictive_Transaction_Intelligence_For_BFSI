import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelStatistics } from "@/services/api";

interface Transaction {
  location: string;
  isFraud: boolean;
}

interface FraudHeatmapProps {
  transactions: Transaction[];
  channelStats?: ChannelStatistics[];
}

export const FraudHeatmap = ({ transactions, channelStats }: FraudHeatmapProps) => {
  // Build location stats from transactions if available
  const locationFromTransactions = transactions.length > 0
    ? Object.values(
        transactions.reduce<Record<string, { location: string; fraudCount: number; count: number }>>((acc, txn) => {
          const key = txn.location || "Unknown";
          if (!acc[key]) {
            acc[key] = { location: key, fraudCount: 0, count: 0 };
          }
          acc[key].count += 1;
          if (txn.isFraud) {
            acc[key].fraudCount += 1;
          }
          return acc;
        }, {})
      ).map((item) => ({
        location: item.location,
        count: item.count,
        fraudRate: item.count ? (item.fraudCount / item.count) * 100 : 0,
        avgAmount: undefined as number | undefined,
      }))
    : [];

  // Use real data from transactions or channelStats - no mock fallback
  const data = locationFromTransactions.length > 0
    ? locationFromTransactions
    : channelStats && channelStats.length > 0
    ? channelStats.map(stat => ({
        location: stat.channel,
        fraudRate: stat.fraud_rate,
        count: stat.total,
        avgAmount: stat.avg_amount,
      }))
    : [];

  const sortedData = [...data].sort((a, b) => b.fraudRate - a.fraudRate);

  const getColor = (rate: number) => {
    if (rate > 12) return "bg-destructive";
    if (rate > 8) return "bg-warning";
    if (rate > 5) return "bg-accent";
    return "bg-success";
  };

  // Show empty state when no data
  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fraud Rate by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No location data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud Rate by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedData.map((item) => (
            <div
              key={item.location}
              className={`${getColor(item.fraudRate)} text-white p-4 rounded-lg transition-transform hover:scale-105 cursor-pointer`}
            >
              <div className="font-semibold text-sm mb-1">{item.location}</div>
              <div className="text-2xl font-bold">{item.fraudRate.toFixed(1)}%</div>
              <div className="text-xs opacity-90">{item.count} transactions</div>
              {('avgAmount' in item) && (
                <div className="text-xs opacity-75 mt-1">
                  ₹{Math.round(item.avgAmount).toLocaleString()} avg
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
