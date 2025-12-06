import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fetchCases, createCase, fetchCase, updateCase, fetchCaseRecommendations, Case, updateTransactionsBatch, submitFeedback } from "@/services/api";
import { Plus, FolderOpen, AlertTriangle, CheckCircle, Clock, Sparkles, RefreshCw, Database } from "lucide-react";

const CaseManagement = () => {
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const casesQuery = useQuery({
    queryKey: ["cases", statusFilter],
    queryFn: () => fetchCases(statusFilter === "all" ? undefined : statusFilter),
  });

  const caseDetailQuery = useQuery({
    queryKey: ["case", selectedCase],
    queryFn: () => fetchCase(selectedCase!),
    enabled: !!selectedCase,
  });

  const recommendationsQuery = useQuery({
    queryKey: ["case-recommendations", selectedCase],
    queryFn: () => fetchCaseRecommendations(selectedCase!),
    enabled: !!selectedCase,
  });

  const createCaseMutation = useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setNewCaseOpen(false);
      toast.success("Case created");
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: ({ caseId, update }: { caseId: string; update: any }) => updateCase(caseId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", selectedCase] });
      toast.success("Case updated");
    },
  });

  const [updatingTransactions, setUpdatingTransactions] = useState(false);
  const [transactionsUpdated, setTransactionsUpdated] = useState(false);

  const cases = casesQuery.data?.cases || [];
  const caseDetail = caseDetailQuery.data;
  const recommendations = recommendationsQuery.data;

  const [newCase, setNewCase] = useState({
    title: "",
    description: "",
    priority: "medium",
    transaction_ids: "",
  });

  const handleCreateCase = () => {
    createCaseMutation.mutate({
      ...newCase,
      transaction_ids: newCase.transaction_ids.split(",").map((id) => id.trim()),
    });
  };

  const handleUpdateStatus = (status: string) => {
    if (selectedCase) {
      updateCaseMutation.mutate({ caseId: selectedCase, update: { status } });
    }
  };

  // Feedback loop: Update transactions based on case resolution
  const handleUpdateTransactions = async (confirmedFraud: boolean) => {
    if (!caseDetail || caseDetail.transaction_ids.length === 0) {
      toast.error("No transactions to update");
      return;
    }

    setUpdatingTransactions(true);
    try {
      // Update transactions with verified fraud status
      await updateTransactionsBatch(caseDetail.transaction_ids, {
        is_fraud: confirmedFraud ? 1 : 0,
        verified: true,
        verified_by: "case_management",
        notes: `Case ${caseDetail.case_id}: ${confirmedFraud ? "Confirmed Fraud" : "False Positive"}`,
      });

      // Also submit feedback for each transaction for model retraining
      for (const txnId of caseDetail.transaction_ids) {
        await submitFeedback({
          transaction_id: txnId,
          prediction: confirmedFraud ? "Fraud" : "Legitimate",
          is_correct: true,
          user_id: "case_management",
          notes: `Verified via case ${caseDetail.case_id}`,
          actual_label: confirmedFraud ? "Fraud" : "Legitimate",
        });
      }

      toast.success(`Updated ${caseDetail.transaction_ids.length} transactions as ${confirmedFraud ? "Fraud" : "Legitimate"}`);
      setTransactionsUpdated(true);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (error: any) {
      toast.error(`Failed to update transactions: ${error.message}`);
    } finally {
      setUpdatingTransactions(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "investigating":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "high") return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (priority === "medium") return <Clock className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <AppShell
      title="Case Management"
      subtitle="Fraud investigation cases and workflows"
      actions={
        <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Investigation Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="Suspicious high-value transactions"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Pattern of unusual activity detected..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newCase.priority} onValueChange={(value) => setNewCase({ ...newCase, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transaction IDs (comma-separated)</Label>
                  <Input
                    value={newCase.transaction_ids}
                    onChange={(e) => setNewCase({ ...newCase, transaction_ids: e.target.value })}
                    placeholder="TXN-001, TXN-002"
                  />
                </div>
              </div>
              <Button onClick={handleCreateCase} disabled={createCaseMutation.isPending}>
                {createCaseMutation.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Cases</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {cases.map((caseItem: Case) => (
                  <div
                    key={caseItem.case_id}
                    onClick={() => setSelectedCase(caseItem.case_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCase === caseItem.case_id ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <span className="font-mono text-sm">{caseItem.case_id}</span>
                      </div>
                      {getPriorityIcon(caseItem.priority)}
                    </div>
                    <p className="font-semibold text-sm mb-1">{caseItem.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(caseItem.status)}>{caseItem.status}</Badge>
                      <span className="text-xs text-muted-foreground">{caseItem.transaction_count} txns</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCase ? (
              <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                <div className="text-center">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Select a case to view details</p>
                </div>
              </div>
            ) : caseDetail ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="insights">AI Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Case ID</Label>
                      <p className="font-mono">{caseDetail.case_id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="flex gap-2 mt-1">
                        <Badge className={getStatusColor(caseDetail.status)}>{caseDetail.status}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Priority</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getPriorityIcon(caseDetail.priority)}
                        <span className="capitalize">{caseDetail.priority}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <p>{caseDetail.assigned_to || "Unassigned"}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{caseDetail.description}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Actions</Label>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleUpdateStatus("investigating")}>
                        Start Investigation
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("resolved")}>
                        Mark Resolved
                      </Button>
                    </div>
                  </div>

                  {/* Feedback Loop - Update Transactions Section */}
                  {caseDetail.status === "resolved" && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Feedback Loop - Update Transactions</Label>
                      <p className="text-sm text-muted-foreground mt-1 mb-3">
                        Update the fraud status of {caseDetail.transaction_ids.length} transaction(s) based on investigation results.
                        This data will be used to improve model accuracy.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleUpdateTransactions(true)}
                          disabled={updatingTransactions || transactionsUpdated}
                        >
                          <Database className="mr-2 h-4 w-4" />
                          {updatingTransactions ? "Updating..." : transactionsUpdated ? "Updated ✓" : "Confirm as Fraud"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateTransactions(false)}
                          disabled={updatingTransactions || transactionsUpdated}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {transactionsUpdated ? "Updated ✓" : "Mark as Legitimate (False Positive)"}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-3">Related Transactions</h4>
                    <div className="space-y-2">
                      {caseDetail.transaction_ids.map((txnId) => (
                        <div key={txnId} className="flex items-center justify-between p-2 rounded bg-muted">
                          <span className="font-mono text-sm">{txnId}</span>
                          <Button size="sm" variant="ghost">
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {recommendations ? (
                    <Card className="border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                          AI-Powered Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="whitespace-pre-wrap">
                        {recommendations.recommendations}
                      </CardContent>
                    </Card>
                  ) : (
                    <Button onClick={() => recommendationsQuery.refetch()}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Insights
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default CaseManagement;
