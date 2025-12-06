import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { storeSimulationTransactionsBatch, SimulationTransaction } from "@/services/api";
import { Database, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { useTransactionStore } from "@/context/TransactionStoreContext";

const CaseManagement = () => {
  const queryClient = useQueryClient();
  const [savingToMongo, setSavingToMongo] = useState(false);

  // Transaction Store for Simulation/Model Testing workflow
  const { 
    pendingTransactions, 
    verifiedTransactions, 
    markTransactionVerified, 
    clearVerifiedTransactions,
    getPendingCount,
    getVerifiedCount 
  } = useTransactionStore();

  // Feedback loop for simulation/model testing transactions
  const handleMarkCorrect = (id: string) => {
    const txn = pendingTransactions.find((t) => t.id === id);
    if (!txn) return;

    const actualLabel = txn.prediction.prediction; // Keep model prediction
    markTransactionVerified(id, true, actualLabel, "Verified as correct");
    toast.success("Transaction verified as correct");
  };

  const handleMarkIncorrect = (id: string) => {
    const txn = pendingTransactions.find((t) => t.id === id);
    if (!txn) return;

    // Flip the label
    const actualLabel = txn.prediction.prediction === "Fraud" ? "Legitimate" : "Fraud";
    markTransactionVerified(id, false, actualLabel, "Corrected by user");
    toast.success("Transaction corrected and verified");
  };

  // Save verified transactions to MongoDB
  const saveVerifiedToMongoDB = async () => {
    if (verifiedTransactions.length === 0) {
      toast.error("No verified transactions to save");
      return;
    }

    setSavingToMongo(true);
    try {
      const transactions: SimulationTransaction[] = verifiedTransactions.map((t) => ({
        transaction_id: t.id,
        customer_id: t.payload.customer_id,
        transaction_amount: t.payload.amount,
        channel: t.payload.channel,
        timestamp: t.payload.timestamp || new Date().toISOString(),
        is_fraud: t.feedback!.actualLabel === "Fraud" ? 1 : 0,
        fraud_probability: t.prediction.risk_score ?? t.prediction.fraud_probability ?? 0,
        risk_level: t.prediction.risk_level || "Low",
        source: t.source,
        account_age_days: t.payload.account_age_days,
        kyc_verified: t.payload.kyc_verified,
        hour: t.payload.hour,
      }));

      const result = await storeSimulationTransactionsBatch(transactions);
      toast.success(`Saved ${result.stored_count} verified transactions to MongoDB`);
      clearVerifiedTransactions(verifiedTransactions.map((t) => t.id));
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSavingToMongo(false);
    }
  };



  return (
    <AppShell
      title="Case Management"
      subtitle="Transaction verification & feedback loop"
    >
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Verification ({getPendingCount()})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({getVerifiedCount()})
          </TabsTrigger>
        </TabsList>

        {/* NEW: PENDING VERIFICATION TAB */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verification - Simulation & Model Testing</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review model predictions and verify their correctness before saving to MongoDB
              </p>
            </CardHeader>
            <CardContent>
              {pendingTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Database className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-semibold">No pending transactions</p>
                  <p className="text-sm">Run a simulation or model test to generate transactions for verification</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {pendingTransactions.map((txn) => (
                      <Card key={txn.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <p className="font-mono font-semibold">{txn.id}</p>
                                <Badge variant={txn.source === "simulation" ? "secondary" : "outline"}>{txn.source}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Amount:</span>{" "}
                                  <span className="font-semibold">₹{txn.payload.amount.toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Channel:</span> {txn.payload.channel}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Account Age:</span> {txn.payload.account_age_days} days
                                </div>
                                <div>
                                  <span className="text-muted-foreground">KYC:</span> {txn.payload.kyc_verified}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <Badge variant={txn.prediction.prediction === "Fraud" ? "destructive" : "default"} className="text-sm">
                                  Model Prediction: {txn.prediction.prediction}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Confidence: {((txn.prediction.risk_score ?? txn.prediction.fraud_probability ?? 0) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            <div className="border-l pl-4 space-y-2 min-w-[200px]">
                              <p className="text-sm font-semibold text-center mb-3">Was this prediction correct?</p>
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleMarkCorrect(txn.id)}
                                  className="w-full"
                                >
                                  <ThumbsUp className="mr-2 h-4 w-4" />
                                  Mark as Correct
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkIncorrect(txn.id)}
                                  className="w-full"
                                >
                                  <ThumbsDown className="mr-2 h-4 w-4" />
                                  Mark as Incorrect
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground text-center mt-2">
                                Incorrect = flips the label
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: VERIFIED TRANSACTIONS TAB */}
        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Verified Transactions</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transactions verified and ready to save to MongoDB for model retraining
                  </p>
                </div>
                <Button
                  onClick={saveVerifiedToMongoDB}
                  disabled={verifiedTransactions.length === 0 || savingToMongo}
                  size="lg"
                >
                  <Database className="mr-2 h-4 w-4" />
                  {savingToMongo ? "Saving..." : `Save ${verifiedTransactions.length} to MongoDB`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {verifiedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-semibold">No verified transactions</p>
                  <p className="text-sm">Verify transactions from the Pending Verification tab first</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {verifiedTransactions.map((txn) => (
                      <Card key={txn.id} className="border-green-500 dark:border-green-700 bg-green-50 dark:bg-green-950/30">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-sm font-semibold">{txn.id}</p>
                                <Badge variant="outline">{txn.source}</Badge>
                                {txn.feedback?.isCorrect ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <ThumbsUp className="mr-1 h-3 w-3" /> Correct
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-orange-600 text-white">
                                    <ThumbsDown className="mr-1 h-3 w-3" /> Corrected
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Amount:</span> ₹{txn.payload.amount.toLocaleString()}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Model:</span> {txn.prediction.prediction}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Verified As:</span>{" "}
                                  <span className="font-semibold">{txn.feedback?.actualLabel}</span>
                                </div>
                              </div>
                              {txn.feedback?.notes && (
                                <p className="text-xs text-muted-foreground italic">Note: {txn.feedback.notes}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default CaseManagement;
