import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { predictFraud, PredictionRequest, PredictionResponse } from "@/services/api";
import { useTransactionStore, PendingTransaction } from "@/context/TransactionStoreContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Activity, RefreshCw, BarChart } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
} from "recharts";

interface SimulationRecord {
  id: string;
  payload: PredictionRequest;
  status: "pending" | "success" | "error";
  prediction?: PredictionResponse;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

const CHANNELS = ["Mobile", "Web", "ATM", "POS"];

const formatTimestamp = (value?: string) => {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString("en-IN", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (error) {
    return value;
  }
};

// Track fraud count to ensure 9-15 frauds per 100 transactions
let fraudCount = 0;
let totalCount = 0;
let targetFraudRate = 0.09 + Math.random() * 0.06; // 9-15% fraud rate

const buildRandomTransaction = (index: number, batchSize: number, runTimestamp: number): PredictionRequest => {
  totalCount++;
  
  // Calculate target fraud count (9-15% of batch size)
  const targetFraudCount = Math.floor(batchSize * targetFraudRate);
  const remainingTxns = batchSize - totalCount + 1;
  const remainingFraudsNeeded = targetFraudCount - fraudCount;
  
  // Ensure we hit target by making remaining transactions fraud if needed
  const mustBeFraud = remainingFraudsNeeded >= remainingTxns;
  const shouldBeFraud = mustBeFraud || (fraudCount < targetFraudCount && Math.random() < (remainingFraudsNeeded / remainingTxns) * 1.5);
  
  // Unique transaction ID with timestamp to avoid duplicates
  const uniqueId = `SIM${runTimestamp}_${String(index + 1).padStart(4, "0")}`;
  
  // Use current date and random hour for realistic timestamps
  const now = new Date();
  const randomHour = Math.floor(Math.random() * 24);
  const randomMinute = Math.floor(Math.random() * 60);
  const randomSecond = Math.floor(Math.random() * 60);
  now.setHours(randomHour, randomMinute, randomSecond);
  const deviceTimestamp = now.toISOString();

  // Create EXTREME high-risk fraudulent transaction that model WILL detect as fraud (>70% probability)
  if (shouldBeFraud) {
    fraudCount++;
    // Combine MULTIPLE red flags to trigger fraud detection:
    // 1. VERY high amount (way above threshold)
    // 2. Brand NEW account (1-5 days only)
    // 3. Late night hours (midnight to 4am)
    // 4. NO KYC verification
    // 5. ATM channel (physical vulnerability)
    const fraudPatterns = [
      {
        account_age_days: Math.floor(Math.random() * 3) + 1, // 1-3 days old
        amount: Math.floor(Math.random() * 150000 + 100000), // ₹100k-250k (VERY high)
        channel: "ATM",
        kyc_verified: "No",
        hour: [0, 1, 2, 3][Math.floor(Math.random() * 4)],
      },
      {
        account_age_days: Math.floor(Math.random() * 2) + 1, // 1-2 days old
        amount: Math.floor(Math.random() * 120000 + 80000), // ₹80k-200k
        channel: "Web",
        kyc_verified: "No",
        hour: [23, 0, 1, 2][Math.floor(Math.random() * 4)],
      },
      {
        account_age_days: Math.floor(Math.random() * 5) + 1, // 1-5 days old
        amount: Math.floor(Math.random() * 100000 + 75000), // ₹75k-175k
        channel: "ATM",
        kyc_verified: "No",
        hour: [1, 2, 3, 4][Math.floor(Math.random() * 4)],
      }
    ];
    
    const pattern = fraudPatterns[Math.floor(Math.random() * fraudPatterns.length)];
    
    return {
      customer_id: uniqueId,
      account_age_days: pattern.account_age_days,
      amount: pattern.amount,
      channel: pattern.channel,
      kyc_verified: pattern.kyc_verified,
      hour: pattern.hour,
      timestamp: deviceTimestamp,
    };
  }
  
  // Normal legitimate transaction pattern
  return {
    customer_id: uniqueId,
    account_age_days: Math.floor(Math.random() * 800) + 200, // Established account 200-1000 days
    amount: Math.floor(Math.random() * 8000 + 500), // Normal amount ₹500-8500
    channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
    kyc_verified: "Yes", // KYC verified
    hour: Math.floor(Math.random() * 8) + 9, // Business hours 9-17
    timestamp: deviceTimestamp,
  };
};

const SimulationLab = () => {
  const navigate = useNavigate();
  const { addPendingTransactionsBatch, getPendingCount } = useTransactionStore();
  const [batchSize, setBatchSize] = useState(100);
  const [concurrency, setConcurrency] = useState(5);
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);

  const completedRecords = useMemo(() => records.filter((record) => record.status !== "pending"), [records]);

  const summary = useMemo(() => {
    const completed = completedRecords;
    const frauds = completed.filter((r) => r.prediction?.prediction === "Fraud");
    const avgProbability = completed.reduce((acc, record) => {
      if (record.prediction) {
        return acc + (record.prediction.risk_score ?? record.prediction.fraud_probability ?? 0);
      }
      return acc;
    }, 0);
    const avgLatency = completed.reduce((acc, record) => {
      if (record.completedAt) {
        return acc + (record.completedAt - record.startedAt);
      }
      return acc;
    }, 0);

    return {
      completed: completed.length,
      fraudCount: frauds.length,
      fraudRate: completed.length ? (frauds.length / completed.length) * 100 : 0,
      avgProbability: completed.length ? (avgProbability / completed.length) * 100 : 0,
      avgLatency: completed.length ? avgLatency / completed.length : 0,
    };
  }, [completedRecords]);

  const runSimulation = async () => {
    if (running) return;
    setRunning(true);
    setRecords([]);
    setProgress(0);
    
    // Reset fraud counter for new simulation
    fraudCount = 0;
    totalCount = 0;
    targetFraudRate = 0.09 + Math.random() * 0.06; // Random 9-15% rate
    const runTimestamp = Date.now();

    const payloads = Array.from({ length: batchSize }, (_, index) => buildRandomTransaction(index, batchSize, runTimestamp));
    const initialRecords = payloads.map((payload) => ({
      id: payload.customer_id,
      payload,
      status: "pending" as const,
      startedAt: Date.now(),
    }));
    setRecords(initialRecords);

    let completed = 0;
    const results: Array<{ index: number; result: any; error?: string }> = [];

    for (let i = 0; i < payloads.length; i += concurrency) {
      const chunk = payloads.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (payload, chunkIndex) => {
          const recordIndex = i + chunkIndex;
          try {
            const prediction = await predictFraud(payload);
            return { index: recordIndex, result: prediction };
          } catch (error: any) {
            return { index: recordIndex, result: null, error: error?.response?.data?.detail || error.message };
          }
        })
      );
      
      // Batch update state once per chunk
      setRecords((prev) => {
        const copy = [...prev];
        chunkResults.forEach(({ index, result, error }) => {
          copy[index] = {
            ...copy[index],
            status: error ? "error" : "success",
            prediction: result || undefined,
            error: error,
            completedAt: Date.now(),
          };
        });
        return copy;
      });
      
      completed += chunk.length;
      setProgress(Math.round((completed / payloads.length) * 100));
    }

    setRunning(false);
    
    // Auto-send to Case Management - use setRecords callback to get latest state
    setRecords((currentRecords) => {
      const pendingTransactions: PendingTransaction[] = currentRecords
        .filter((record) => record.status === "success" && record.prediction)
        .map((record) => ({
          id: record.id,
          source: 'simulation',
          payload: record.payload,
          prediction: record.prediction!,
          createdAt: record.startedAt,
        }));
      
      if (pendingTransactions.length > 0) {
        addPendingTransactionsBatch(pendingTransactions);
        toast.success(`Simulation complete - ${pendingTransactions.length} transactions sent to Case Management`);
        setTimeout(() => navigate('/cases'), 500);
      } else {
        toast.error("No successful predictions to send");
      }
      
      return currentRecords;
    });
  };



  const riskSeries = useMemo(() => {
    return completedRecords
      .filter((record) => record.prediction)
      .map((record, idx) => ({
        index: idx + 1,
        probability: Math.round((record.prediction!.risk_score ?? record.prediction!.fraud_probability ?? 0) * 100),
      }));
  }, [completedRecords]);

  const recentLog = useMemo(() => {
    return completedRecords.slice(-12).reverse();
  }, [completedRecords]);

  return (
    <AppShell
      title="Simulation Lab"
      subtitle="Generate synthetic transactions for model testing"
      actions={
        <Button size="sm" onClick={runSimulation} disabled={running}>
          <Activity className="mr-2 h-4 w-4" />
          {running ? "Running..." : "Start Simulation"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Processed"
          value={`${summary.completed}/${batchSize}`}
          subtitle="Transactions analyzed"
          icon={BarChart}
          trend="up"
          trendValue={`${progress}%`}
        />
        <MetricCard
          title="Fraud Detected"
          value={summary.fraudCount}
          subtitle={`${summary.fraudRate.toFixed(2)}% hit rate`}
          icon={Activity}
          variant="danger"
        />
        <MetricCard
          title="Avg Confidence"
          value={`${summary.avgProbability.toFixed(1)}%`}
          subtitle={`${summary.avgLatency.toFixed(0)} ms latency`}
          icon={RefreshCw}
          variant="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulation Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batchSize">Transactions</Label>
            <Input
              id="batchSize"
              type="number"
              min={10}
              max={500}
              value={batchSize}
              onChange={(event) => setBatchSize(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concurrency">Parallel Calls</Label>
            <Input
              id="concurrency"
              type="number"
              min={1}
              max={20}
              value={concurrency}
              onChange={(event) => setConcurrency(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={riskSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" tick={false} />
                <Tooltip />
                <Area type="monotone" dataKey="probability" stroke="#c026d3" fill="#c026d3" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {recentLog.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
                    <div>
                      <p className="font-mono text-sm">{record.payload.customer_id}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{record.payload.amount.toLocaleString()} • {record.payload.channel}
                      </p>
                    </div>
                    {record.status === "success" && record.prediction ? (
                      <Badge variant={record.prediction.prediction === "Fraud" ? "destructive" : "default"}>
                        {record.prediction.prediction} | {((record.prediction.risk_score ?? record.prediction.fraud_probability ?? 0) * 100).toFixed(1)}%
                      </Badge>
                    ) : (
                      <Badge variant="outline">Error</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2">#</th>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Timestamp</th>
                  <th>Prediction</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody>
                {completedRecords.map((record, idx) => (
                  <tr key={record.id} className="border-t">
                    <td className="py-2">{idx + 1}</td>
                    <td className="font-mono">{record.payload.customer_id}</td>
                    <td>₹{record.payload.amount.toLocaleString()}</td>
                    <td>{record.payload.channel}</td>
                    <td>{formatTimestamp(record.prediction?.timestamp || record.payload.timestamp)}</td>
                    <td>
                      {record.prediction ? (
                        <Badge variant={record.prediction.prediction === "Fraud" ? "destructive" : "default"}>
                          {record.prediction.prediction}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{record.status}</Badge>
                      )}
                    </td>
                    <td>
                      {record.prediction ? `${((record.prediction.risk_score ?? record.prediction.fraud_probability ?? 0) * 100).toFixed(1)}%` : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default SimulationLab;
