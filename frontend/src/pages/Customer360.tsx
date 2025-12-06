import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  MapPin,
  Smartphone,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

interface CustomerProfile {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  account_created: string;
  lifetime_value: number;
  risk_level: "low" | "medium" | "high";
  total_transactions: number;
  fraud_incidents: number;
}

const Customer360 = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Simulated customer data
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      return Array.from({ length: 20 }, (_, i) => ({
        customer_id: `CUST${String(i + 1).padStart(6, "0")}`,
        name: `Customer ${i + 1}`,
        email: `customer${i + 1}@example.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
        account_created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lifetime_value: Math.random() * 50000 + 1000,
        risk_level: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high",
        total_transactions: Math.floor(Math.random() * 500) + 10,
        fraud_incidents: Math.floor(Math.random() * 5),
      }));
    },
  });

  // Simulated transaction history
  const { data: transactionHistory } = useQuery({
    queryKey: ["customer-transactions", selectedCustomer?.customer_id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      return Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        amount: Math.random() * 500 + 10,
        count: Math.floor(Math.random() * 10) + 1,
      })).reverse();
    },
    enabled: !!selectedCustomer,
  });

  // Simulated behavior patterns
  const { data: behaviorPatterns } = useQuery({
    queryKey: ["customer-behavior", selectedCustomer?.customer_id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      return [
        { category: "Online Shopping", percentage: Math.random() * 40 + 10 },
        { category: "ATM Withdrawals", percentage: Math.random() * 30 + 5 },
        { category: "Bill Payments", percentage: Math.random() * 30 + 5 },
        { category: "Transfers", percentage: Math.random() * 20 + 5 },
      ];
    },
    enabled: !!selectedCustomer,
  });

  // Simulated anomalies
  const { data: anomalies } = useQuery({
    queryKey: ["customer-anomalies", selectedCustomer?.customer_id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      return Array.from({ length: 5 }, (_, i) => ({
        id: `ANOM${i + 1}`,
        description: [
          "Unusual transaction location",
          "High-value transaction spike",
          "Rapid succession of transactions",
          "New device detected",
          "Atypical merchant category",
        ][i],
        timestamp: new Date(Date.now() - i * 48 * 60 * 60 * 1000).toISOString(),
        severity: ["high", "medium", "low"][Math.floor(Math.random() * 3)] as "high" | "medium" | "low",
      }));
    },
    enabled: !!selectedCustomer,
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <AppShell
      title="Customer 360° Profile"
      subtitle="Comprehensive customer view and behavior analysis"
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Lifetime Value</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Fraud Incidents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers?.map((customer) => (
                    <TableRow
                      key={customer.customer_id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-mono text-sm">{customer.customer_id}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.total_transactions ?? 0}</TableCell>
                      <TableCell>₹{(customer.lifetime_value ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(customer.risk_level)}>
                          {customer.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.fraud_incidents > 0 ? (
                          <Badge variant="destructive">{customer.fraud_incidents}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
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

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Profile - {selectedCustomer?.customer_id}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transaction History</TabsTrigger>
                <TabsTrigger value="behavior">Behavior Patterns</TabsTrigger>
                <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Lifetime Value
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <p className="text-2xl font-bold">₹{(selectedCustomer.lifetime_value ?? 0).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Transactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <p className="text-2xl font-bold">{selectedCustomer.total_transactions ?? 0}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Risk Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getRiskColor(selectedCustomer.risk_level)}>
                        {selectedCustomer.risk_level.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Fraud Incidents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <p className="text-2xl font-bold">{selectedCustomer.fraud_incidents ?? 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p>{selectedCustomer.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Customer ID</Label>
                        <p className="font-mono">{selectedCustomer.customer_id}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p>{selectedCustomer.phone}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Account Created</Label>
                        <p>{new Date(selectedCustomer.account_created).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={transactionHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="amount"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          name="Amount ($)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--secondary))"
                          strokeWidth={2}
                          name="Count"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="behavior" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Spending Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={behaviorPatterns}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="percentage" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  {behaviorPatterns?.map((pattern) => (
                    <Card key={pattern.category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{pattern.category}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Progress value={pattern.percentage} className="mb-2" />
                        <p className="text-sm text-muted-foreground">{pattern.percentage.toFixed(1)}% of activity</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="anomalies" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Anomalies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {anomalies?.map((anomaly) => (
                          <Card key={anomaly.id} className="border-l-4 border-l-orange-500">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className={`h-4 w-4 ${getSeverityColor(anomaly.severity)}`} />
                                    <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                                      {anomaly.severity}
                                    </Badge>
                                  </div>
                                  <p className="font-medium mb-1">{anomaly.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(anomaly.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default Customer360;
