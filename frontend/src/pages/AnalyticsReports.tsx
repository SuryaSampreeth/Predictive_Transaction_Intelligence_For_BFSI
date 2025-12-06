import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FraudDistributionChart } from "@/components/dashboard/FraudDistributionChart";
import { FraudByTypeChart } from "@/components/dashboard/FraudByTypeChart";
import { FraudByHourChart } from "@/components/dashboard/FraudByHourChart";
import { FraudTrendChart } from "@/components/dashboard/FraudTrendChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { FeatureImportance } from "@/components/dashboard/FeatureImportance";
import {
  fetchFraudStatistics,
  fetchChannelStatistics,
  fetchModelMetrics,
  fetchTransactions,
  fetchHourlyStatistics,
  FraudStatistics,
  ChannelStatistics,
  ModelMetrics,
  TransactionListResponse,
} from "@/services/api";
import { RefreshCw, DownloadCloud, FileBarChart2 } from "lucide-react";
import { toast } from "sonner";

const AnalyticsReports = () => {
  const transactionsQuery = useQuery<TransactionListResponse>({
    queryKey: ["analytics-transactions"],
    queryFn: () => fetchTransactions(0, 500),
  });
  const fraudStatsQuery = useQuery<FraudStatistics>({ queryKey: ["fraud-stats"], queryFn: fetchFraudStatistics });
  const channelStatsQuery = useQuery<ChannelStatistics[]>({ queryKey: ["channel-stats"], queryFn: fetchChannelStatistics });
  const metricsQuery = useQuery<ModelMetrics>({ queryKey: ["model-metrics"], queryFn: fetchModelMetrics });
  useQuery({ queryKey: ["hourly-stats"], queryFn: fetchHourlyStatistics });

  const transactions = useMemo(() => {
    return (transactionsQuery.data?.transactions || []).map((txn) => ({
      id: txn.transaction_id,
      date: txn.timestamp,
      amount: txn.transaction_amount,
      type: txn.transaction_type || txn.channel,
      channel: txn.channel,
      location: txn.location || "Mumbai",
      isFraud: txn.is_fraud === 1,
      fraudProbability: txn.is_fraud ? 0.85 : 0.12,
    }));
  }, [transactionsQuery.data]);

  const fraudStats = fraudStatsQuery.data;
  const channelStats = channelStatsQuery.data;
  const metrics = metricsQuery.data;

  const handleRefresh = async () => {
    await Promise.all([
      transactionsQuery.refetch(),
      fraudStatsQuery.refetch(),
      channelStatsQuery.refetch(),
      metricsQuery.refetch(),
    ]);
    toast.success("Analytics refreshed");
  };

  const handleExportReport = () => {
    if (!fraudStats || !metrics) {
      toast.error("Data not ready yet");
      return;
    }
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      fraudStats,
      modelMetrics: metrics,
      sampleTransactions: transactions.slice(0, 20),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-report-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.info("Report downloaded as JSON");
  };

  return (
    <AppShell
      title="Analytics & Reports"
      subtitle="Operational telemetry, fraud trends, and model health"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Transactions"
          value={fraudStats ? fraudStats.total.toLocaleString() : "-"}
          icon={FileBarChart2}
          trend="up"
          trendValue="Live"
          subtitle="Rolling 24h window"
        />
        <MetricCard
          title="Detected Fraud"
          value={fraudStats ? `${fraudStats.fraud_count}` : "-"}
          icon={FileBarChart2}
          trend="up"
          trendValue={fraudStats ? `${fraudStats.fraud_rate}% rate` : "--"}
          subtitle="Confirmed cases"
          variant="danger"
        />
        <MetricCard
          title="Avg Fraud Amount"
          value={fraudStats?.avg_fraud_amount ? `₹${fraudStats.avg_fraud_amount.toLocaleString()}` : "₹0"}
          icon={FileBarChart2}
          trend="down"
          trendValue="vs last week"
          subtitle="High-risk exposure"
        />
        <MetricCard
          title="Model Accuracy"
          value={metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : "-"}
          icon={FileBarChart2}
          subtitle={metrics ? `Precision ${(metrics.precision * 100).toFixed(1)}%` : "Awaiting metrics"}
          variant="success"
        />
      </div>

      {/* Feature Importance Section */}
      <FeatureImportance />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FraudDistributionChart
          fraudCount={fraudStats?.fraud_count || 0}
          legitimateCount={fraudStats?.legitimate_count || 0}
        />
        <FraudByTypeChart channelStats={channelStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FraudByHourChart transactions={transactions} />
        <FraudTrendChart transactions={transactions} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insight Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Fraud rate is tracking at {fraudStats?.fraud_rate ?? "--"}% this period with a
            ₹{fraudStats?.avg_fraud_amount?.toLocaleString() || "--"} average loss exposure.
          </p>
          <p>
            • Model performance remains stable with accuracy {(metrics?.accuracy || 0).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 1 })}.
          </p>
          <p>• Channel level view highlights {channelStats?.[0]?.channel || "Mobile"} as the current hot zone.</p>
        </CardContent>
      </Card>

      <TransactionsTable transactions={transactions} />
    </AppShell>
  );
};

export default AnalyticsReports;
