import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Download, Calendar } from "lucide-react";
import { fetchTransactions } from "@/services/api";

interface Transaction {
  transaction_id: string;
  customer_id: string;
  amount: number;
  merchant_name: string;
  transaction_type: string;
  transaction_time: string;
  location: string;
  device_type: string;
  risk_score: number;
  is_fraud: boolean;
}

const TransactionSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    dateRange: "all",
    minAmount: "",
    maxAmount: "",
    channel: "all",
    riskLevel: "all",
  });

  // Fetch real transaction data from API
  const { data: transactionResponse } = useQuery({
    queryKey: ["search-transactions"],
    queryFn: async () => {
      const response = await fetchTransactions(0, 500);
      return response;
    },
  });

  // Map API response to expected format with null safety
  const transactions: Transaction[] = (transactionResponse?.transactions || []).map((txn: any) => ({
    transaction_id: txn.transaction_id || txn.customer_id || `TXN${Math.random().toString(36).substr(2, 9)}`,
    customer_id: txn.customer_id || "Unknown",
    amount: txn.amount ?? txn.transaction_amount ?? 0,
    merchant_name: txn.merchant_name || txn.merchant || "Unknown Merchant",
    transaction_type: txn.transaction_type || txn.channel || "purchase",
    transaction_time: txn.transaction_time || txn.timestamp || new Date().toISOString(),
    location: txn.location || "Unknown",
    device_type: (txn.device_type || txn.channel || "mobile").toLowerCase(),
    risk_score: txn.risk_score ?? txn.fraud_probability ?? 0,
    is_fraud: txn.is_fraud ?? (txn.risk_score > 0.7 || txn.fraud_probability > 0.7) ?? false,
  }));

  const filteredTransactions = transactions?.filter((txn) => {
    const matchesSearch =
      !searchQuery ||
      txn.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.merchant_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAmount =
      (!filters.minAmount || txn.amount >= parseFloat(filters.minAmount)) &&
      (!filters.maxAmount || txn.amount <= parseFloat(filters.maxAmount));

    const matchesChannel = filters.channel === "all" || txn.device_type === filters.channel;

    const matchesRisk =
      filters.riskLevel === "all" ||
      (filters.riskLevel === "high" && txn.risk_score >= 0.7) ||
      (filters.riskLevel === "medium" && txn.risk_score >= 0.3 && txn.risk_score < 0.7) ||
      (filters.riskLevel === "low" && txn.risk_score < 0.3);

    return matchesSearch && matchesAmount && matchesChannel && matchesRisk;
  });

  const handleExport = () => {
    if (!filteredTransactions) return;

    const csv = [
      ["Transaction ID", "Customer ID", "Amount", "Merchant", "Type", "Time", "Location", "Device", "Risk Score", "Fraud"],
      ...filteredTransactions.map((txn) => [
        txn.transaction_id,
        txn.customer_id,
        (txn.amount ?? 0).toFixed(2),
        txn.merchant_name,
        txn.transaction_type,
        txn.transaction_time,
        txn.location,
        txn.device_type,
        (txn.risk_score ?? 0).toFixed(3),
        txn.is_fraud ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return "text-red-600 bg-red-50";
    if (score >= 0.3) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <AppShell
      title="Transaction Search"
      subtitle="Search and analyze transaction history"
      actions={
        <Button size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Results
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by transaction ID, customer ID, or merchant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
                >
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Min Amount"
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                />

                <Input
                  placeholder="Max Amount"
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                />

                <Select
                  value={filters.channel}
                  onValueChange={(value) => setFilters({ ...filters, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="atm">ATM</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.riskLevel}
                  onValueChange={(value) => setFilters({ ...filters, riskLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredTransactions?.length || 0} of {transactions?.length || 0} transactions
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setFilters({
                      dateRange: "all",
                      minAmount: "",
                      maxAmount: "",
                      channel: "all",
                      riskLevel: "all",
                    });
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions?.map((txn) => (
                    <TableRow
                      key={txn.transaction_id}
                      onClick={() => setSelectedTransaction(txn)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-mono text-sm">{txn.transaction_id}</TableCell>
                      <TableCell className="font-mono text-sm">{txn.customer_id}</TableCell>
                      <TableCell className="font-medium">₹{(txn.amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{txn.merchant_name}</TableCell>
                      <TableCell className="capitalize">{txn.transaction_type}</TableCell>
                      <TableCell className="text-sm">{new Date(txn.transaction_time).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{txn.device_type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getRiskColor(txn.risk_score ?? 0)}>
                          {((txn.risk_score ?? 0) * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {txn.is_fraud ? (
                          <Badge variant="destructive">Fraud</Badge>
                        ) : (
                          <Badge variant="outline">Legitimate</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono">{selectedTransaction.transaction_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer ID</Label>
                  <p className="font-mono">{selectedTransaction.customer_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="text-xl font-bold">₹{(selectedTransaction.amount ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Risk Score</Label>
                  <Badge className={getRiskColor(selectedTransaction.risk_score ?? 0)}>
                    {((selectedTransaction.risk_score ?? 0) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Merchant</Label>
                  <p>{selectedTransaction.merchant_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="capitalize">{selectedTransaction.transaction_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{selectedTransaction.location}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Device</Label>
                  <p className="capitalize">{selectedTransaction.device_type}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p>{new Date(selectedTransaction.transaction_time).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fraud Status</span>
                  {selectedTransaction.is_fraud ? (
                    <Badge variant="destructive" className="text-base">Fraudulent</Badge>
                  ) : (
                    <Badge variant="outline" className="text-base">Legitimate</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default TransactionSearch;
