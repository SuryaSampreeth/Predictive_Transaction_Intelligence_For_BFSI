import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Target, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchModelMetrics, fetchAllResults } from "@/services/api";
import { toast } from "sonner";

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc?: number;
  model_version?: string;
}

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    fraudCount: 0,
    avgRiskScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Load model metrics
      const metricsData = await fetchModelMetrics();
      setMetrics(metricsData);

      // Load prediction stats
      const results = await fetchAllResults(1000, false);
      const fraudCount = (results.results || []).filter((r: any) => r.prediction === "Fraud").length;
      const avgRisk = (results.results || []).reduce((sum: number, r: any) => sum + r.risk_score, 0) / (results.results?.length || 1);

      setStats({
        total: results.total || 0,
        fraudCount,
        avgRiskScore: avgRisk,
      });

      toast.success("Performance data loaded");
    } catch (error) {
      console.error("Failed to load performance data:", error);
      toast.error("Failed to load performance metrics");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "text-green-600";
    if (score >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.9) return "Excellent";
    if (score >= 0.7) return "Good";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <AppShell title="Performance Metrics" subtitle="Model performance analysis">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading performance metrics...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Performance Metrics"
      subtitle="Model performance, accuracy, and system statistics"
      actions={
        <Button size="sm" onClick={loadPerformanceData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Fraud Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.fraudCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.fraudCount / stats.total) * 100).toFixed(1) : 0}% fraud rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Avg Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(stats.avgRiskScore * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Across all predictions</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Model Information</CardTitle>
          <CardDescription>Details about the fraud detection model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Model Type</p>
              <p className="text-lg font-semibold">Random Forest</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-lg font-semibold">{metrics?.model_version || "1.0"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Features</p>
              <p className="text-lg font-semibold">13</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Rules</p>
              <p className="text-lg font-semibold">6 Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Model Performance Metrics
          </CardTitle>
          <CardDescription>
            Evaluation metrics from model training and validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Accuracy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Accuracy</span>
                  <Badge variant="secondary">
                    {getScoreBadge(metrics?.accuracy || 0)}
                  </Badge>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(metrics?.accuracy || 0)}`}>
                  {((metrics?.accuracy || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(metrics?.accuracy || 0) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Percentage of correct predictions (both fraud and legitimate)
              </p>
            </div>

            {/* Precision */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Precision</span>
                  <Badge variant="secondary">
                    {getScoreBadge(metrics?.precision || 0)}
                  </Badge>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(metrics?.precision || 0)}`}>
                  {((metrics?.precision || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(metrics?.precision || 0) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                When model predicts fraud, how often is it correct?
              </p>
            </div>

            {/* Recall */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Recall</span>
                  <Badge variant="secondary">
                    {getScoreBadge(metrics?.recall || 0)}
                  </Badge>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(metrics?.recall || 0)}`}>
                  {((metrics?.recall || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(metrics?.recall || 0) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Of all actual fraud cases, how many did the model catch?
              </p>
            </div>

            {/* F1 Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">F1 Score</span>
                  <Badge variant="secondary">
                    {getScoreBadge(metrics?.f1_score || 0)}
                  </Badge>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(metrics?.f1_score || 0)}`}>
                  {((metrics?.f1_score || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(metrics?.f1_score || 0) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Harmonic mean of precision and recall (balanced measure)
              </p>
            </div>

            {/* ROC AUC */}
            {metrics?.roc_auc && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ROC AUC</span>
                    <Badge variant="secondary">
                      {getScoreBadge(metrics.roc_auc)}
                    </Badge>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(metrics.roc_auc)}`}>
                    {(metrics.roc_auc * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.roc_auc * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Model's ability to distinguish between fraud and legitimate transactions
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Rules */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active Business Rules</CardTitle>
          <CardDescription>Rule-based fraud detection logic combined with ML model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">High Value New Account</p>
                <p className="text-xs text-muted-foreground">
                  Amount &gt; ₹10,000 AND Account Age &lt; 30 days
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">Unverified KYC High Amount</p>
                <p className="text-xs text-muted-foreground">
                  KYC Not Verified AND Amount &gt; ₹5,000
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">Unusual Hour Transaction</p>
                <p className="text-xs text-muted-foreground">
                  Hour between 2 AM - 5 AM AND Amount &gt; ₹3,000
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">Very High Amount</p>
                <p className="text-xs text-muted-foreground">
                  Amount &gt; ₹50,000 (Automatic Flag)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              <Badge variant="outline" className="mt-0.5">5</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">New Account Unverified</p>
                <p className="text-xs text-muted-foreground">
                  Account Age &lt; 7 days AND KYC Not Verified
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
              <Badge variant="outline" className="mt-0.5">6</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">High ATM Withdrawal</p>
                <p className="text-xs text-muted-foreground">
                  Channel = ATM/POS AND Amount &gt; ₹20,000
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default PerformanceDashboard;