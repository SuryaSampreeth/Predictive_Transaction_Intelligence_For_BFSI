import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { fetchAlertStream, fetchLiveTransactions, fetchSystemHealth } from "@/services/api";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Activity, Bell, CheckCircle, Clock, RefreshCw, TrendingUp } from "lucide-react";

const MonitoringWall = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const alertsQuery = useQuery({
    queryKey: ["alert-stream"],
    queryFn: () => fetchAlertStream(30),
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const transactionsQuery = useQuery({
    queryKey: ["live-transactions"],
    queryFn: () => fetchLiveTransactions(20),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const healthQuery = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchSystemHealth,
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const alerts = alertsQuery.data?.alerts || [];
  const transactions = transactionsQuery.data?.transactions || [];
  const health = healthQuery.data;

  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical").length;
  const newAlerts = alerts.filter((a: any) => a.status === "new").length;

  return (
    <AppShell
      title="Real-time Monitoring"
      subtitle="Live transaction stream and alert feed"
      actions={
        <div className="flex gap-2 items-center">
          <Badge variant={autoRefresh ? "default" : "outline"} className="cursor-pointer" onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Badge>
          <Button size="sm" onClick={() => {
            alertsQuery.refetch();
            transactionsQuery.refetch();
            healthQuery.refetch();
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Active Alerts"
          value={alerts.length}
          subtitle={`${newAlerts} new`}
          icon={Bell}
          trend="up"
          trendValue="Live"
          variant="danger"
        />
        <MetricCard
          title="Critical"
          value={criticalAlerts}
          subtitle="Immediate action"
          icon={Activity}
          variant="danger"
        />
        <MetricCard
          title="Live Stream"
          value={transactions.length}
          subtitle="Transactions/min"
          icon={TrendingUp}
          trend="up"
          trendValue={`${transactionsQuery.data?.fraud_count || 0} flagged`}
        />
        <MetricCard
          title="System Status"
          value={health?.status === "healthy" ? "Healthy" : "Degraded"}
          subtitle={`${health?.throughput?.requests_per_minute || 0} req/min`}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {alerts.map((alert: any) => (
                  <div
                    key={alert.alert_id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === "critical"
                        ? "border-l-red-500 bg-red-50"
                        : alert.severity === "high"
                        ? "border-l-orange-500 bg-orange-50"
                        : "border-l-yellow-500 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{alert.alert_id}</span>
                        </div>
                        <p className="font-semibold">{alert.type}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          TXN: {alert.transaction_id} • ₹{(alert.amount || 0).toLocaleString()} • {alert.channel || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Risk: {((alert.fraud_probability || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{alert.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="inline h-3 w-3" /> {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {alert.status === "new" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toast.info("Investigating alert")}>
                          Investigate
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.success("Alert acknowledged")}>
                          Acknowledge
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {transactions.map((txn: any) => (
                  <div
                    key={txn.transaction_id}
                    className={`p-3 rounded-lg border ${
                      txn.status === "flagged" ? "border-red-200 bg-red-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">{txn.transaction_id}</span>
                      <Badge variant={txn.status === "flagged" ? "destructive" : "default"}>
                        {txn.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Customer</p>
                        <p className="font-medium">{txn.customer_id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Amount</p>
                        <p className="font-medium">₹{(txn.amount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Channel</p>
                        <p className="font-medium">{txn.channel || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Risk</p>
                        <p className={`font-medium ${txn.risk_level === "High" ? "text-red-600" : "text-green-600"}`}>
                          {txn.risk_level || 'Low'} ({((txn.fraud_score || 0) * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(txn.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {health && health.services && (
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Services</h4>
                {Object.entries(health.services || {}).map(([name, service]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{name}</span>
                    <Badge variant={service?.status === "up" ? "default" : "destructive"}>
                      {service?.status || "unknown"} ({service?.latency_ms || 0}ms)
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Resources</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU</span>
                      <span>{health.resources?.cpu_usage || 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${health.resources?.cpu_usage || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory</span>
                      <span>{health.resources?.memory_usage || 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${health.resources?.memory_usage || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Throughput</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requests/min</span>
                    <span className="font-medium">{health.throughput?.requests_per_minute || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Predictions/min</span>
                    <span className="font-medium">{health.throughput?.predictions_per_minute || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Response</span>
                    <span className="font-medium">{health.throughput?.avg_response_time_ms || 0}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
};

export default MonitoringWall;
