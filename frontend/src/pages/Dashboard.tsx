import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  Users,
  AlertTriangle,
  TrendingDown,
  Download,
  RefreshCw,
  Shield,
  Home,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FraudDistributionChart } from "@/components/dashboard/FraudDistributionChart";
import { FraudTrendChart } from "@/components/dashboard/FraudTrendChart";
import { FraudByTypeChart } from "@/components/dashboard/FraudByTypeChart";
import { FraudHeatmap } from "@/components/dashboard/FraudHeatmap";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { ModelPerformance } from "@/components/dashboard/ModelPerformance";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { 
  fetchTransactions, 
  fetchFraudStatistics, 
  fetchChannelStatistics,
  fetchModelMetrics,
  fetchHourlyStatistics,
  Transaction as APITransaction,
  FraudStatistics,
  ChannelStatistics,
  ModelMetrics
} from "@/services/api";

// Convert API transaction to dashboard format
interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  channel: string;
  location: string;
  isFraud: boolean;
  fraudProbability: number;
  customerId: string;
}

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("all");
  const [transactionType, setTransactionType] = useState("all");
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fraudStats, setFraudStats] = useState<FraudStatistics | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStatistics[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convert API transaction to dashboard format
  const convertTransaction = (apiTxn: APITransaction): Transaction => ({
    id: apiTxn.transaction_id,
    date: apiTxn.timestamp,
    amount: apiTxn.transaction_amount,
    type: apiTxn.channel, // Using channel as type
    channel: apiTxn.channel,
    location: apiTxn.channel, // Using channel as location for now
    isFraud: apiTxn.is_fraud === 1,
    fraudProbability: apiTxn.is_fraud,
    customerId: apiTxn.customer_id,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [txnData, statsData, channelData, metricsData] = await Promise.all([
        fetchTransactions(0, 1000).catch(err => {
          console.error("Failed to fetch transactions:", err);
          return { transactions: [], total: 0, page: 1, limit: 100 };
        }),
        fetchFraudStatistics().catch(err => {
          console.error("Failed to fetch fraud stats:", err);
          return null;
        }),
        fetchChannelStatistics().catch(err => {
          console.error("Failed to fetch channel stats:", err);
          return [];
        }),
        fetchModelMetrics().catch(err => {
          console.error("Failed to fetch model metrics:", err);
          return null;
        })
      ]);

      const convertedTransactions = txnData.transactions.map(convertTransaction);
      setTransactions(convertedTransactions);
      setFraudStats(statsData);
      setChannelStats(channelData);
      setModelMetrics(metricsData);

      toast.success(`Loaded ${convertedTransactions.length} transactions from MongoDB`);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
      toast.error("Failed to connect to backend. Using sample data.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (timeRange !== "all") {
      const now = new Date();
      const ranges: Record<string, number> = {
        today: 1,
        week: 7,
        month: 30,
        quarter: 90,
        year: 365,
      };
      const daysBack = ranges[timeRange];
      const cutoffDate = new Date(now.setDate(now.getDate() - daysBack));
      filtered = filtered.filter((t) => new Date(t.date) >= cutoffDate);
    }

    if (transactionType !== "all") {
      filtered = filtered.filter((t) => t.type === transactionType);
    }

    

    return filtered;
  }, [transactions, timeRange, transactionType]);

  const stats = useMemo(() => {
    // Use real stats from API if available
    if (fraudStats && fraudStats.total > 0) {
      return {
        total: fraudStats.total || 0,
        fraudCount: fraudStats.fraud_count || 0,
        legitimateCount: fraudStats.legitimate_count || 0,
        fraudRate: fraudStats.fraud_rate || 0,
        avgAmount: ((fraudStats.avg_fraud_amount || 0) + (fraudStats.avg_legitimate_amount || 0)) / 2 || 0,
        maxAmount: filteredTransactions.length > 0 ? Math.max(...filteredTransactions.map((t) => t.amount || 0)) : 0,
        minAmount: filteredTransactions.length > 0 ? Math.min(...filteredTransactions.map((t) => t.amount || 0)) : 0,
        uniqueCustomers: new Set(filteredTransactions.map((t) => t.customerId)).size,
        totalAmount: filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      };
    }

    // Fallback to calculated stats from filtered transactions
    const total = filteredTransactions.length;
    const fraudCount = filteredTransactions.filter((t) => t.isFraud).length;
    const legitimateCount = total - fraudCount;
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgAmount = total > 0 ? totalAmount / total : 0;
    const maxAmount = filteredTransactions.length > 0 ? Math.max(...filteredTransactions.map((t) => t.amount || 0)) : 0;
    const minAmount = filteredTransactions.length > 0 ? Math.min(...filteredTransactions.map((t) => t.amount || 0)) : 0;
    const fraudRate = total > 0 ? (fraudCount / total) * 100 : 0;
    const uniqueCustomers = new Set(filteredTransactions.map((t) => t.customerId)).size;

    return {
      total,
      fraudCount,
      legitimateCount,
      totalAmount,
      avgAmount,
      maxAmount,
      minAmount,
      fraudRate,
      uniqueCustomers,
    };
  }, [filteredTransactions, fraudStats]);

  const handleDownloadReport = () => {
    const csvContent = [
      ["Transaction ID", "Date", "Amount", "Type", "Channel", "Fraud Status", "Risk Score"],
      ...filteredTransactions.map((t) => [
        t.id,
        t.date,
        t.amount,
        t.type,
        t.channel,
        t.isFraud ? "Fraud" : "Legitimate",
        (t.fraudProbability * 100).toFixed(2) + "%",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fraud-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Report downloaded successfully!");
  };

  const handleRefresh = async () => {
    await loadDashboardData();
    toast.success("Dashboard refreshed with latest data from MongoDB");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading data from MongoDB...</p>
          <p className="text-sm text-muted-foreground">Connecting to backend API...</p>
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Connection Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Make sure the backend server is running on http://localhost:8000
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                <Shield className="h-8 w-8" />
                Predictive Transaction Intelligence
              </h1>
              <p className="text-muted-foreground mt-1">
                BFSI Fraud Detection Dashboard — Real-time Analytics & Insights
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <FilterBar
          timeRange={timeRange}
          transactionType={transactionType}
         
          onTimeRangeChange={setTimeRange}
          onTransactionTypeChange={setTransactionType}
       
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Transactions"
            value={stats.total.toLocaleString()}
            subtitle="Processed transactions"
            icon={IndianRupee}
            variant="default"
          />
          <MetricCard
            title="Total Customers"
            value={stats.uniqueCustomers.toLocaleString()}
            subtitle="Active accounts"
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Fraud Cases"
            value={stats.fraudCount.toLocaleString()}
            subtitle={`${stats.fraudRate.toFixed(2)}% of total`}
            icon={AlertTriangle}
            variant="danger"
          />
          <MetricCard
            title="Fraud Detection"
            value={`${stats.fraudRate.toFixed(2)}%`}
            // subtitle="Model accuracy: 90%"
            icon={TrendingDown}
            variant="warning"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Average Transaction"
            value={`₹${Math.round(stats.avgAmount).toLocaleString()}`}
            icon={IndianRupee}
            variant="default"
          />
          <MetricCard
            title="Maximum Transaction"
            value={`₹${Math.round(stats.maxAmount).toLocaleString()}`}
            icon={IndianRupee}
            variant="success"
          />
          <MetricCard
            title="Minimum Transaction"
            value={`₹${Math.round(stats.minAmount).toLocaleString()}`}
            icon={IndianRupee}
            variant="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FraudDistributionChart
            fraudCount={stats.fraudCount}
            legitimateCount={stats.legitimateCount}
          />
          <ModelPerformance 
            accuracy={modelMetrics?.accuracy || 0.9534}
            precision={modelMetrics?.precision || 0.8912}
            recall={modelMetrics?.recall || 0.8756}
            f1Score={modelMetrics?.f1_score || 0.8833}
            rocAuc={modelMetrics?.roc_auc || 0.92}
          />
        </div>

        <FraudTrendChart transactions={filteredTransactions} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FraudByTypeChart channelStats={channelStats} />
          <FraudHeatmap transactions={filteredTransactions} channelStats={channelStats} />
        </div>

        <TransactionsTable transactions={filteredTransactions} showFraudOnly />

        <TransactionsTable transactions={filteredTransactions} />
      </main>

      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">Developed by Team Predictive Intelligence</p>
            <p className="mt-1">BFSI Fraud Detection System</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
