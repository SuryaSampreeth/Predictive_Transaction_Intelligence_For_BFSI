import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, AlertTriangle, CheckCircle, Filter } from "lucide-react";
import { toast } from "sonner";
import { fetchAllResults } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PredictionResult {
  transaction_id: string;
  customer_id?: string;
  prediction: string;
  risk_score?: number;
  fraud_probability?: number;
  confidence?: number;
  reason?: string;
  rule_flags?: string[];
  amount?: number;
  channel?: string;
  processed_at?: string;
  predicted_at?: string;
  risk_level?: string;
}

const ResultsHistory = () => {
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await fetchAllResults(100, false);
      setResults(data.results || []);
      toast.success(`Loaded ${data.returned || 0} predictions`);
    } catch (error) {
      console.error("Failed to load results:", error);
      toast.error("Failed to load prediction history");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    if (filter === "fraud") return result.prediction === "Fraud";
    if (filter === "legitimate") return result.prediction === "Legitimate";
    return true;
  });

  const fraudCount = results.filter(r => r.prediction === "Fraud").length;
  const legitimateCount = results.length - fraudCount;
  const fraudRate = results.length > 0 ? (fraudCount / results.length) * 100 : 0;

  const handleExport = () => {
    const csvContent = [
      ["Transaction ID", "Customer ID", "Prediction", "Risk Score", "Confidence", "Amount", "Channel", "Reason", "Processed At"],
      ...filteredResults.map(r => {
        const riskScore = r.risk_score ?? r.fraud_probability ?? 0;
        const timestamp = r.processed_at || r.predicted_at;
        return [
          r.transaction_id || "",
          r.customer_id || r.transaction_id || "",
          r.prediction || "",
          (riskScore * 100).toFixed(2) + "%",
          (r.confidence ?? riskScore * 100).toFixed(2) + "%",
          r.amount ?? "N/A",
          r.channel || "N/A",
          r.reason || "",
          timestamp ? new Date(timestamp).toLocaleString() : "N/A"
        ];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fraud-predictions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Report downloaded successfully!");
  };

  return (
    <AppShell
      title="Prediction History"
      subtitle="View all fraud detection predictions and results"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadResults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExport} disabled={filteredResults.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{results.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fraud Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fraudCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Legitimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{legitimateCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fraud Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fraudRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="fraud">Fraud Only</SelectItem>
                <SelectItem value="legitimate">Legitimate Only</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              Showing {filteredResults.length} of {results.length} results
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Results</CardTitle>
          <CardDescription>
            Complete history of fraud detection predictions with ML model + business rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Loading prediction history...</p>
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No predictions found</p>
                <p className="text-sm text-muted-foreground">
                  Submit a transaction from the Prediction page to see results here
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Rules Triggered</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, idx) => {
                    // Handle both risk_score and fraud_probability from API
                    const riskScore = result.risk_score ?? result.fraud_probability ?? 0;
                    const timestamp = result.processed_at || result.predicted_at;
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">
                          {result.transaction_id || "N/A"}
                        </TableCell>
                        <TableCell>{result.customer_id || result.transaction_id || "N/A"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={result.prediction === "Fraud" ? "destructive" : "default"}
                            className="flex items-center gap-1 w-fit"
                          >
                            {result.prediction === "Fraud" ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {result.prediction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={riskScore > 0.5 ? "text-red-600 font-semibold" : ""}>
                            {(riskScore * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {result.amount ? `₹${result.amount.toLocaleString()}` : "N/A"}
                        </TableCell>
                        <TableCell>
                          {result.channel ? (
                            <Badge variant="outline">{result.channel}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.rule_flags && result.rule_flags.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {result.rule_flags.length} rules
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timestamp ? new Date(timestamp).toLocaleString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default ResultsHistory;