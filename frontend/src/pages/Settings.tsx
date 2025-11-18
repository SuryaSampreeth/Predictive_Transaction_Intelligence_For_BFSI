import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  fetchModelThresholds,
  fetchNotificationRules,
  updateModelThresholds,
  updateNotificationRules,
  ModelThresholds,
  NotificationRules,
} from "@/services/api";
import { Save, RefreshCw } from "lucide-react";

const SettingsPage = () => {
  const queryClient = useQueryClient();

  const thresholdsQuery = useQuery<ModelThresholds>({
    queryKey: ["model-thresholds"],
    queryFn: fetchModelThresholds,
  });

  const notificationQuery = useQuery<NotificationRules>({
    queryKey: ["notification-rules"],
    queryFn: fetchNotificationRules,
  });

  const [thresholds, setThresholds] = useState<ModelThresholds>({
    high_risk_threshold: 0.7,
    medium_risk_threshold: 0.4,
    high_value_amount: 50000,
    new_account_days: 30,
  });

  const [notifications, setNotifications] = useState<NotificationRules>({
    email_enabled: true,
    sms_enabled: false,
    high_risk_immediate: true,
    batch_digest: true,
    digest_frequency: "daily",
  });

  const thresholdsMutation = useMutation({
    mutationFn: updateModelThresholds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-thresholds"] });
      toast.success("Model thresholds updated");
    },
    onError: () => {
      toast.error("Failed to update thresholds");
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: updateNotificationRules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Notification rules updated");
    },
    onError: () => {
      toast.error("Failed to update notifications");
    },
  });

  const handleSaveThresholds = () => {
    thresholdsMutation.mutate(thresholds);
  };

  const handleSaveNotifications = () => {
    notificationsMutation.mutate(notifications);
  };

  // Sync local state when data loads
  useEffect(() => {
    if (thresholdsQuery.data) {
      setThresholds(thresholdsQuery.data);
    }
  }, [thresholdsQuery.data]);

  useEffect(() => {
    if (notificationQuery.data) {
      setNotifications(notificationQuery.data);
    }
  }, [notificationQuery.data]);

  return (
    <AppShell
      title="Settings & Configuration"
      subtitle="System configuration, model tuning, and preferences"
      actions={
        <Button size="sm" variant="outline" onClick={() => {
          thresholdsQuery.refetch();
          notificationQuery.refetch();
        }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <Tabs defaultValue="model" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="model">Model Thresholds</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System Config</TabsTrigger>
        </TabsList>

        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Thresholds</CardTitle>
              <CardDescription>
                Configure fraud risk classification thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="highRisk">High Risk Threshold</Label>
                  <Input
                    id="highRisk"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={thresholds.high_risk_threshold}
                    onChange={(e) =>
                      setThresholds((prev) => ({
                        ...prev,
                        high_risk_threshold: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Probability above this triggers high risk alerts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mediumRisk">Medium Risk Threshold</Label>
                  <Input
                    id="mediumRisk"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={thresholds.medium_risk_threshold}
                    onChange={(e) =>
                      setThresholds((prev) => ({
                        ...prev,
                        medium_risk_threshold: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Probability above this triggers medium risk alerts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highValue">High Value Amount (₹)</Label>
                  <Input
                    id="highValue"
                    type="number"
                    step="1000"
                    value={thresholds.high_value_amount}
                    onChange={(e) =>
                      setThresholds((prev) => ({
                        ...prev,
                        high_value_amount: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Transactions above this are flagged as high-value
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newAccount">New Account Days</Label>
                  <Input
                    id="newAccount"
                    type="number"
                    value={thresholds.new_account_days}
                    onChange={(e) =>
                      setThresholds((prev) => ({
                        ...prev,
                        new_account_days: parseInt(e.target.value),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Accounts younger than this are considered new
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveThresholds} disabled={thresholdsMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {thresholdsMutation.isPending ? "Saving..." : "Save Thresholds"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Rules</CardTitle>
              <CardDescription>
                Configure alert delivery and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch
                  checked={notifications.email_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, email_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive critical alerts via SMS
                  </p>
                </div>
                <Switch
                  checked={notifications.sms_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, sms_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Immediate High Risk Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Send immediate alerts for high-risk transactions
                  </p>
                </div>
                <Switch
                  checked={notifications.high_risk_immediate}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, high_risk_immediate: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Batch Digest</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive periodic summary of alerts
                  </p>
                </div>
                <Switch
                  checked={notifications.batch_digest}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, batch_digest: checked }))
                  }
                />
              </div>

              <Button onClick={handleSaveNotifications} disabled={notificationsMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {notificationsMutation.isPending ? "Saving..." : "Save Notification Rules"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Advanced system settings and operational parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold">API Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">
                    Current limit: 1000 requests/minute
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold">Model Version</h4>
                  <p className="text-sm text-muted-foreground">
                    Active: v1.0.0 • Last trained: Nov 15, 2025
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold">Database</h4>
                  <p className="text-sm text-muted-foreground">
                    MongoDB Atlas • Status: Connected
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold">AI Assistant</h4>
                  <p className="text-sm text-muted-foreground">
                    Gemini Pro • Enabled for insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default SettingsPage;
