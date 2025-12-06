import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  User,
  Calendar,
  Shield,
  RefreshCw,
  Download,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { submitFeedback, getFeedbackByTransaction, fetchTransactionById } from "@/services/api";

interface TransactionDetail {
  transaction_id: string;
  customer_id: string;
  timestamp: string;
  amount: number;
  channel: string;
  kyc_verified: string;
  account_age_days: number;
  hour: number;
  is_fraud: number;
  fraud_probability?: number;
  risk_level?: string;
  device_info?: {
    type: string;
    os: string;
    browser: string;
    ip_address: string;
  };
  location?: {
    city: string;
    state: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
}

const TransactionDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedTransactions, setRelatedTransactions] = useState<TransactionDetail[]>([]);
  
  // Feedback state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [showFeedbackNotes, setShowFeedbackNotes] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<any>(null);

  useEffect(() => {
    loadTransactionDetails();
  }, [id]);

  useEffect(() => {
    // Check if feedback already exists for this transaction
    if (transaction?.transaction_id) {
      checkExistingFeedback();
    }
  }, [transaction?.transaction_id]);

  const checkExistingFeedback = async () => {
    if (!transaction?.transaction_id) return;
    try {
      const result = await getFeedbackByTransaction(transaction.transaction_id);
      if (result.found && result.feedback) {
        setExistingFeedback(result.feedback);
        setFeedbackSubmitted(result.feedback.is_correct);
      }
    } catch (error) {
      console.error("Failed to check existing feedback:", error);
    }
  };

  const handleFeedback = async (isCorrect: boolean) => {
    if (!transaction) return;
    
    setFeedbackLoading(true);
    try {
      await submitFeedback({
        transaction_id: transaction.transaction_id,
        prediction: transaction.is_fraud ? "Fraud" : "Legitimate",
        is_correct: isCorrect,
        risk_score: transaction.fraud_probability,
        notes: feedbackNotes || undefined,
      });
      
      setFeedbackSubmitted(isCorrect);
      setShowFeedbackNotes(false);
      
      if (isCorrect) {
        toast.success("✓ Feedback recorded: Prediction marked as correct");
      } else {
        toast.info("Feedback recorded: Prediction marked as incorrect - flagged for review");
      }
    } catch (error) {
      toast.error("Failed to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const loadTransactionDetails = async () => {
    if (!id) {
      toast.error("Transaction ID not provided");
      navigate("/dashboard");
      return;
    }

    try {
      setLoading(true);
      // Fetch real transaction from API
      const apiTransaction = await fetchTransactionById(id);
      
      if (!apiTransaction) {
        toast.error("Transaction not found");
        navigate("/dashboard");
        return;
      }
      
      // Safely extract location info
      const locationInfo = apiTransaction.location;
      let city = "Unknown";
      let state = "Unknown";
      
      if (typeof locationInfo === 'string') {
        city = locationInfo;
      } else if (locationInfo && typeof locationInfo === 'object') {
        city = (locationInfo as any).city || "Unknown";
        state = (locationInfo as any).state || "Unknown";
      }
      
      // Transform API response to TransactionDetail format
      const transactionDetail: TransactionDetail = {
        transaction_id: apiTransaction.transaction_id,
        customer_id: apiTransaction.customer_id,
        timestamp: apiTransaction.timestamp,
        amount: apiTransaction.transaction_amount,
        channel: apiTransaction.channel || "Unknown",
        kyc_verified: apiTransaction.kyc_verified || "Unknown",
        account_age_days: apiTransaction.account_age_days || 0,
        hour: apiTransaction.hour || new Date(apiTransaction.timestamp).getHours(),
        is_fraud: apiTransaction.is_fraud,
        fraud_probability: (apiTransaction as any).fraud_probability,
        risk_level: apiTransaction.is_fraud === 1 ? "High" : "Low",
        device_info: (apiTransaction as any).device_info || {
          type: apiTransaction.channel || "Unknown",
          os: "Unknown",
          browser: "Unknown",
          ip_address: "Unknown"
        },
        location: {
          city,
          state, 
          country: "India",
          coordinates: { lat: 0, lng: 0 }
        }
      };
      
      setTransaction(transactionDetail);
      setRelatedTransactions([]); // Related transactions can be fetched separately if needed
    } catch (error) {
      console.error("Failed to load transaction details:", error);
      toast.error("Failed to load transaction details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = () => {
    toast.success("Transaction flagged for review");
  };

  const handleExport = () => {
    toast.success("Exporting transaction report");
  };

  if (loading || !transaction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  const riskColor = transaction.risk_level === "High" ? "text-red-500" :
                   transaction.risk_level === "Medium" ? "text-yellow-500" : "text-green-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Transaction Details</h1>
                <p className="text-sm text-muted-foreground">{transaction.transaction_id}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleFlag}>
                <Flag className="h-4 w-4 mr-2" />
                Flag
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <Card className={transaction.is_fraud ? "border-red-500" : "border-green-500"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {transaction.is_fraud ? (
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                ) : (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                )}
                <div>
                  <h2 className="text-2xl font-bold">
                    {transaction.is_fraud ? "Fraudulent Transaction" : "Legitimate Transaction"}
                  </h2>
                  <p className="text-muted-foreground">
                    Confidence: {((transaction.fraud_probability || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold">₹{transaction.amount.toLocaleString()}</p>
                <Badge className={riskColor}>
                  {transaction.risk_level} Risk
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Timestamp</p>
                      <p className="font-medium">{new Date(transaction.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Channel</p>
                      <p className="font-medium">{transaction.channel}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">KYC Status</p>
                      <Badge variant={transaction.kyc_verified === "Yes" ? "default" : "destructive"}>
                        {transaction.kyc_verified === "Yes" ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Transaction Hour</p>
                      <p className="font-medium">{transaction.hour}:00</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Location & Device</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {transaction.location?.city}, {transaction.location?.state}
                      </p>
                      <p className="text-xs text-muted-foreground">{transaction.location?.country}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Device</p>
                      <p className="font-medium">{transaction.device_info?.type}</p>
                      <p className="text-xs text-muted-foreground">{transaction.device_info?.os}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">IP Address</p>
                      <p className="font-mono text-sm">{transaction.device_info?.ip_address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feedback Loop Section */}
            <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Feedback Loop
                </CardTitle>
                <CardDescription>
                  Help improve our fraud detection model by verifying this prediction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingFeedback && feedbackSubmitted !== null ? (
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${
                    feedbackSubmitted 
                      ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300" 
                      : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                  }`}>
                    {feedbackSubmitted ? (
                      <>
                        <CheckCircle className="h-6 w-6" />
                        <div>
                          <p className="font-medium">Prediction verified as correct</p>
                          <p className="text-sm opacity-80">
                            Feedback submitted on {new Date(existingFeedback.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-6 w-6" />
                        <div>
                          <p className="font-medium">Prediction marked as incorrect</p>
                          <p className="text-sm opacity-80">Flagged for model review</p>
                          {existingFeedback.notes && (
                            <p className="text-sm mt-1 italic">"{existingFeedback.notes}"</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Was this {transaction.is_fraud ? "fraud" : "legitimate"} prediction correct?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleFeedback(true)}
                        disabled={feedbackLoading}
                        className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                      >
                        {feedbackLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-4 w-4 mr-2" />
                        )}
                        Yes, Correct
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowFeedbackNotes(true)}
                        disabled={feedbackLoading}
                        className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        No, Incorrect
                      </Button>
                    </div>
                    
                    {showFeedbackNotes && (
                      <div className="space-y-3 pt-3 border-t">
                        <Label htmlFor="feedback-notes" className="text-sm font-medium">
                          Add notes about the error (optional)
                        </Label>
                        <Textarea
                          id="feedback-notes"
                          placeholder={`e.g., This was actually ${transaction.is_fraud ? "a legitimate" : "a fraudulent"} transaction because...`}
                          value={feedbackNotes}
                          onChange={(e) => setFeedbackNotes(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={() => handleFeedback(false)}
                            disabled={feedbackLoading}
                            className="flex-1"
                          >
                            {feedbackLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ThumbsDown className="h-4 w-4 mr-2" />
                            )}
                            Submit as Incorrect
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowFeedbackNotes(false);
                              setFeedbackNotes("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Details about the customer associated with this transaction</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer ID</p>
                    <p className="font-mono font-medium">{transaction.customer_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Age</p>
                    <p className="font-medium">{transaction.account_age_days} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">KYC Status</p>
                    <Badge variant={transaction.kyc_verified === "Yes" ? "default" : "destructive"}>
                      {transaction.kyc_verified === "Yes" ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Profile</p>
                    <Badge className={riskColor}>{transaction.risk_level}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
                <CardDescription>Device and network information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Browser</p>
                    <p className="font-medium">{transaction.device_info?.browser}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Operating System</p>
                    <p className="font-medium">{transaction.device_info?.os}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Device Type</p>
                    <p className="font-medium">{transaction.device_info?.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-mono text-sm">{transaction.device_info?.ip_address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Related Transactions</CardTitle>
                <CardDescription>Recent transactions from the same customer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedTransactions.map((txn) => (
                    <div key={txn.transaction_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {txn.is_fraud ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-mono text-sm">{txn.transaction_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{txn.amount.toLocaleString()}</p>
                        <Badge variant={txn.is_fraud ? "destructive" : "default"} className="text-xs">
                          {txn.is_fraud ? "Fraud" : "Legitimate"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TransactionDetailsPage;
