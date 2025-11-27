import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Shield,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchAlerts,
  fetchAlertStatistics,
  acknowledgeAlert,
  resolveAlert,
  markAlertFalsePositive,
} from "@/services/api";

interface Alert {
  alert_id: string;
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  alert_type: string;
  severity: string;
  message: string;
  details: {
    amount: number;
    flags: string[];
    flag_count: number;
  };
  acknowledged: boolean;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
}

const AlertsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showFalsePositiveDialog, setShowFalsePositiveDialog] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvedBy, setResolvedBy] = useState("admin");

  // Fetch alerts with auto-refresh
  const alertsQuery = useQuery({
    queryKey: ["alerts", statusFilter, severityFilter],
    queryFn: () =>
      fetchAlerts({
        status: statusFilter === "all" ? undefined : statusFilter,
        severity: severityFilter === "all" ? undefined : severityFilter,
        limit: 100,
      }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch statistics
  const statsQuery = useQuery({
    queryKey: ["alert-statistics"],
    queryFn: fetchAlertStatistics,
    refetchInterval: 15000,
  });

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-statistics"] });
      toast.success("Alert acknowledged");
    },
    onError: () => toast.error("Failed to acknowledge alert"),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ alertId, data }: { alertId: string; data: any }) =>
      resolveAlert(alertId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-statistics"] });
      setShowResolveDialog(false);
      setResolveNotes("");
      setSelectedAlert(null);
      toast.success("Alert resolved");
    },
    onError: () => toast.error("Failed to resolve alert"),
  });

  const falsePositiveMutation = useMutation({
    mutationFn: ({ alertId, data }: { alertId: string; data: any }) =>
      markAlertFalsePositive(alertId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-statistics"] });
      setShowFalsePositiveDialog(false);
      setResolveNotes("");
      setSelectedAlert(null);
      toast.success("Marked as false positive");
    },
    onError: () => toast.error("Failed to mark as false positive"),
  });

  const alerts = alertsQuery.data?.alerts || [];
  const stats = statsQuery.data?.statistics || {};

  const filteredAlerts = alerts.filter((alert: Alert) => {
    const matchesSearch =
      alert.alert_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatus = (alert: Alert) => {
    if (alert.resolved) return "resolved";
    if (alert.acknowledged) return "acknowledged";
    return "pending";
  };

  const pendingCount = alerts.filter((a: Alert) => !a.acknowledged && !a.resolved).length;
  const highRiskCount = alerts.filter(
    (a: Alert) => a.severity === "High" && !a.resolved
  ).length;

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "critical":
      case "high":
        return "text-red-500 bg-red-500/10";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "low":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getStatusColor = (alert: Alert) => {
    if (alert.resolved) return "outline";
    if (alert.acknowledged) return "default";
    return "destructive";
  };

  const getStatusLabel = (alert: Alert) => {
    if (alert.resolved) return "Resolved";
    if (alert.acknowledged) return "Acknowledged";
    return "Pending";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Bell className="h-6 w-6 text-primary" />
                  Alerts & Notifications
                </h1>
                <p className="text-sm text-muted-foreground">Real-time fraud alert management</p>
              </div>
            </div>
            
            <Button size="sm" onClick={() => {
              alertsQuery.refetch();
              statsQuery.refetch();
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Alerts</p>
                  <p className="text-3xl font-bold">{pendingCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                  <p className="text-3xl font-bold">{highRiskCount}</p>
                </div>
                <Shield className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                  <p className="text-3xl font-bold">{alerts.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by transaction ID or customer ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          {alertsQuery.isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading alerts...</p>
              </CardContent>
            </Card>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No alerts found</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map((alert: Alert) => (
              <Card key={alert.alert_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{alert.transaction_id}</CardTitle>
                        <Badge variant={getStatusColor(alert)} className="text-xs">
                          {getStatusLabel(alert).toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>
                        Customer: {alert.customer_id} • {new Date(alert.timestamp).toLocaleString()}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskColor(alert.severity)}>
                        {alert.severity} Severity
                      </Badge>
                      <Badge variant="outline">{alert.alert_type}</Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold">Amount:</span>
                      <span className="text-lg">₹{(alert.details?.amount || 0).toLocaleString()}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>Flags: {alert.details?.flag_count || 0}</span>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">{alert.message}</p>
                      {alert.details?.flags && alert.details.flags.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Risk Flags:</p>
                          {alert.details.flags.slice(0, 5).map((flag, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{flag}</span>
                            </div>
                          ))}
                          {alert.details.flags.length > 5 && (
                            <p className="text-xs text-muted-foreground ml-5">
                              +{alert.details.flags.length - 5} more flags
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!alert.resolved && (
                      <div className="flex gap-2 pt-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeMutation.mutate(alert.alert_id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowResolveDialog(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowFalsePositiveDialog(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          False Positive
                        </Button>
                      </div>
                    )}
                    
                    {alert.resolved && alert.resolved_by && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <p>Resolved by: {alert.resolved_by}</p>
                        {alert.resolved_at && (
                          <p>Resolved at: {new Date(alert.resolved_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Mark this alert as resolved and add resolution notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Resolved By</Label>
              <Input
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Enter resolution details..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAlert) {
                  resolveMutation.mutate({
                    alertId: selectedAlert.alert_id,
                    data: {
                      resolved_by: resolvedBy,
                      resolution_notes: resolveNotes,
                    },
                  });
                }
              }}
              disabled={resolveMutation.isPending}
            >
              Resolve Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* False Positive Dialog */}
      <Dialog open={showFalsePositiveDialog} onOpenChange={setShowFalsePositiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as False Positive</DialogTitle>
            <DialogDescription>
              This will mark the alert as a false positive and help improve detection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Marked By</Label>
              <Input
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Why is this a false positive?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFalsePositiveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedAlert) {
                  falsePositiveMutation.mutate({
                    alertId: selectedAlert.alert_id,
                    data: {
                      marked_by: resolvedBy,
                      notes: resolveNotes,
                    },
                  });
                }
              }}
              disabled={falsePositiveMutation.isPending}
            >
              Mark False Positive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlertsPage;
