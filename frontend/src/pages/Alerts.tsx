import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchAlerts,
  fetchAlertStatistics,
  acknowledgeAlert,
  resolveAlert,
  markAlertFalsePositive,
  deleteAlert,
} from "@/services/api";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Trash2,
  Eye,
  AlertOctagon,
} from "lucide-react";

interface Alert {
  alert_id: string;
  transaction_id: string;
  customer_id: string;
  alert_type: string;
  severity: string;
  message: string;
  details: {
    amount: number;
    flags: string[];
    flag_count: number;
  };
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
}

const Alerts = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showFalsePositiveDialog, setShowFalsePositiveDialog] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvedBy, setResolvedBy] = useState("admin");

  // Fetch alerts
  const alertsQuery = useQuery({
    queryKey: ["alerts", statusFilter, severityFilter],
    queryFn: () =>
      fetchAlerts({
        status: statusFilter === "all" ? undefined : statusFilter,
        severity: severityFilter === "all" ? undefined : severityFilter,
        limit: 100,
      }),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
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
      toast.success("Alert marked as false positive");
    },
    onError: () => toast.error("Failed to mark as false positive"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-statistics"] });
      toast.success("Alert deleted");
    },
    onError: () => toast.error("Failed to delete alert"),
  });

  const alerts = alertsQuery.data?.alerts || [];
  const stats = statsQuery.data?.statistics || {};

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <AlertOctagon className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "medium":
        return <Bell className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (alert: Alert) => {
    if (alert.resolved) {
      return <Badge variant="outline" className="bg-green-50">Resolved</Badge>;
    }
    if (alert.acknowledged) {
      return <Badge variant="outline" className="bg-blue-50">Acknowledged</Badge>;
    }
    return <Badge variant="default">New</Badge>;
  };

  const filteredAlerts = alerts.filter((alert: Alert) => {
    if (statusFilter === "pending" && (alert.acknowledged || alert.resolved)) return false;
    if (statusFilter === "acknowledged" && (!alert.acknowledged || alert.resolved)) return false;
    if (statusFilter === "resolved" && !alert.resolved) return false;
    return true;
  });

  return (
    <AppShell
      title="Fraud Alerts"
      subtitle="Real-time fraud detection alerts and case management"
      actions={
        <Button
          size="sm"
          onClick={() => {
            alertsQuery.refetch();
            statsQuery.refetch();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_alerts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Resolution rate: {stats.resolution_rate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Acknowledged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.acknowledged || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Under investigation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.resolved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Closed cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStatusFilter("all");
                  setSeverityFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
          <CardDescription>
            Click on an alert to view details and take actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-semibold">No alerts found</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    No alerts match your current filters
                  </p>
                </div>
              ) : (
                filteredAlerts.map((alert: Alert) => (
                  <Card
                    key={alert.alert_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              {getStatusBadge(alert)}
                              <Badge variant="outline">{alert.alert_type}</Badge>
                            </div>
                            <h4 className="font-semibold mb-1">{alert.message}</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Alert ID: {alert.alert_id}</p>
                              <p>Transaction: {alert.transaction_id}</p>
                              <p>Customer: {alert.customer_id}</p>
                              <p>
                                Amount: ₹{(alert.details?.amount || 0).toLocaleString()}
                              </p>
                              <p>Flags: {alert.details?.flag_count || 0}</p>
                            </div>
                            {alert.details?.flags && alert.details.flags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {alert.details.flags.slice(0, 3).map((flag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {flag}
                                  </Badge>
                                ))}
                                {alert.details.flags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{alert.details.flags.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                          {!alert.resolved && (
                            <div className="flex gap-1 mt-3">
                              {!alert.acknowledged && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    acknowledgeMutation.mutate(alert.alert_id);
                                  }}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Ack
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAlert(alert);
                                  setShowResolveDialog(true);
                                }}
                              >
                                Resolve
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

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
            <Button
              variant="outline"
              onClick={() => setShowFalsePositiveDialog(false)}
            >
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
            >
              Mark False Positive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Alerts;
