import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, CheckCircle, Brain, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { predictFraud, PredictionRequest, PredictionResponse, getLLMExplanation } from "@/services/api";
import { Badge } from "@/components/ui/badge";

const PredictionPage = () => {
  const [loading, setLoading] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmExplanation, setLlmExplanation] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [formData, setFormData] = useState<PredictionRequest>({
    customer_id: "",
    account_age_days: 365,
    amount: 5000,              // Changed from transaction_amount
    channel: "Mobile",
    kyc_verified: "Yes",
    hour: new Date().getHours(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPrediction(null);
    setLlmExplanation(null);  // Clear LLM explanation for new prediction

    try {
      const result = await predictFraud(formData);
      setPrediction(result);
      
      if (result.prediction === "Fraud") {
        toast.error("⚠️ High Risk Transaction Detected!");
      } else {
        toast.success("✓ Transaction Appears Legitimate");
      }
    } catch (error: any) {
      console.error("Prediction error:", error);
      toast.error("Failed to analyze transaction. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetLLMExplanation = async () => {
    if (!prediction) return;
    
    setLlmLoading(true);
    try {
      const response = await getLLMExplanation({
        transaction_id: prediction.transaction_id,
        customer_id: formData.customer_id,
        amount: formData.amount,
        channel: formData.channel,
        account_age_days: formData.account_age_days,
        kyc_verified: formData.kyc_verified,
        hour: formData.hour || 0,
        prediction: prediction.prediction,
        risk_score: prediction.risk_score,
        risk_level: prediction.risk_score > 0.7 ? "High" : prediction.risk_score > 0.3 ? "Medium" : "Low",
        risk_factors: prediction.rule_flags || [],
      });
      setLlmExplanation(response.explanation);
      toast.success("AI explanation generated!");
    } catch (error) {
      toast.error("Failed to generate AI explanation");
    } finally {
      setLlmLoading(false);
    }
  };

  const handleInputChange = (field: keyof PredictionRequest, value: any) => {
    if (field === 'account_age_days' || field === 'amount' || field === 'hour') {
      const numValue = parseFloat(value);
      setFormData(prev => ({ ...prev, [field]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getRiskColor = (prediction: string) => {
    if (prediction === "Fraud") return "text-red-600 bg-red-50 border-red-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getRiskIcon = (prediction: string) => {
    return prediction === "Fraud" 
      ? <AlertTriangle className="h-8 w-8 text-red-600" />
      : <CheckCircle className="h-8 w-8 text-green-600" />;
  };

  return (
    <AppShell
      title="Model Testing"
      subtitle="Single transaction fraud prediction and analysis"
      actions={
        <Button size="sm" onClick={() => setPrediction(null)} disabled={!prediction}>
          <Brain className="mr-2 h-4 w-4" />
          New Test
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Enter transaction information to analyze fraud risk</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer ID</Label>
                <Input 
                  id="customer_id" 
                  placeholder="e.g., CUST_12345" 
                  value={formData.customer_id} 
                  onChange={(e) => handleInputChange("customer_id", e.target.value)} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Transaction Amount (₹)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  min="1" 
                  step="0.01" 
                  placeholder="e.g., 5000" 
                  value={formData.amount} 
                  onChange={(e) => handleInputChange("amount", parseFloat(e.target.value))} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_age_days">Account Age (days)</Label>
                <Input 
                  id="account_age_days" 
                  type="number" 
                  min="0" 
                  placeholder="e.g., 365" 
                  value={formData.account_age_days} 
                  onChange={(e) => handleInputChange("account_age_days", parseInt(e.target.value))} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="channel">Transaction Channel</Label>
                <Select value={formData.channel} onValueChange={(value) => handleInputChange("channel", value)}>
                  <SelectTrigger id="channel">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Web">Web</SelectItem>
                    <SelectItem value="Atm">ATM</SelectItem>
                    <SelectItem value="Pos">POS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kyc_verified">KYC Verification Status</Label>
                <Select value={formData.kyc_verified} onValueChange={(value) => handleInputChange("kyc_verified", value)}>
                  <SelectTrigger id="kyc_verified">
                    <SelectValue placeholder="Select KYC status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Verified</SelectItem>
                    <SelectItem value="No">Not Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hour">Transaction Hour (0-23)</Label>
                <Input 
                  id="hour" 
                  type="number" 
                  min="0" 
                  max="23" 
                  placeholder="e.g., 14" 
                  value={formData.hour} 
                  onChange={(e) => handleInputChange("hour", parseInt(e.target.value))} 
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Analyze Transaction
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Prediction Result</CardTitle>
            <CardDescription>ML model analysis with business rules</CardDescription>
          </CardHeader>
          <CardContent>
            {!prediction && !loading && (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center space-y-2">
                  <Shield className="h-16 w-16 mx-auto opacity-20" />
                  <p>Submit a transaction to see prediction results</p>
                </div>
              </div>
            )}
            
            {loading && (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="text-muted-foreground">Analyzing transaction...</p>
                </div>
              </div>
            )}
            
            {prediction && !loading && (
              <div className="space-y-6">
                {/* Main Prediction Result */}
                <div className={`border-2 rounded-lg p-6 ${getRiskColor(prediction.prediction)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getRiskIcon(prediction.prediction)}
                      <div>
                        <h3 className="text-2xl font-bold">{prediction.prediction}</h3>
                        <p className="text-sm opacity-80">
                          {prediction.prediction === "Fraud" ? "High Risk" : "Low Risk"}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={prediction.prediction === "Fraud" ? "destructive" : "default"} 
                      className="text-lg px-4 py-2"
                    >
                      {(prediction.risk_score * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Transaction ID and Confidence */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Transaction ID
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold font-mono">{prediction.transaction_id}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Confidence Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold">{prediction.confidence.toFixed(2)}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Decision Reason - NEW from Task 1 */}
                {prediction.reason && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Decision Reason
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{prediction.reason}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Business Rules Triggered - NEW from Task 1 */}
                {prediction.rule_flags && prediction.rule_flags.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-yellow-600" />
                        Business Rules Triggered ({prediction.rule_flags.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {prediction.rule_flags.map((flag, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs bg-white border-yellow-300"
                          >
                            {flag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* LLM-Powered Explanation - Milestone 3 */}
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        AI-Powered Explanation
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleGetLLMExplanation}
                        disabled={llmLoading}
                        className="h-7 text-xs"
                      >
                        {llmLoading ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            {llmExplanation ? "Regenerate" : "Generate"}
                          </>
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {llmExplanation ? (
                      <p className="text-sm leading-relaxed text-purple-900">{llmExplanation}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Click "Generate" to get an AI-powered natural language explanation of this prediction using Google Gemini.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Analysis Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer ID:</span>
                      <span className="font-medium">{formData.customer_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">₹{formData.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channel:</span>
                      <span className="font-medium">{formData.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">KYC Status:</span>
                      <span className="font-medium">{formData.kyc_verified}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Age:</span>
                      <span className="font-medium">{formData.account_age_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model Version:</span>
                      <span className="font-medium">{prediction.model_version || "RandomForest"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Button */}
                <Button 
                  onClick={() => setPrediction(null)} 
                  variant="outline" 
                  className="w-full"
                >
                  Analyze Another Transaction
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default PredictionPage;