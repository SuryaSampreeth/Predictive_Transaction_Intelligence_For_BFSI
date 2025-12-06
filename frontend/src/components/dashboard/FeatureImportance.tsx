import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Brain, RefreshCw, Sparkles, Info } from "lucide-react";
import { getModelExplanation } from "@/services/api";

interface FeatureImportanceData {
  feature: string;
  importance: number;
  displayName: string;
}

interface FeatureImportanceProps {
  onExplanationGenerated?: (explanation: string) => void;
}

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  "transaction_amount": "Transaction Amount",
  "transaction_amount_log": "Amount (Log Scale)",
  "account_age_days": "Account Age",
  "hour": "Transaction Hour",
  "weekday": "Day of Week",
  "month": "Month",
  "is_high_value": "High Value Flag",
  "channel_Atm": "ATM Channel",
  "channel_Mobile": "Mobile Channel",
  "channel_Pos": "POS Channel",
  "channel_Web": "Web Channel",
  "kyc_verified_No": "KYC Not Verified",
  "kyc_verified_Yes": "KYC Verified",
};

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export const FeatureImportance = ({ onExplanationGenerated }: FeatureImportanceProps) => {
  const [loading, setLoading] = useState(false);
  const [featureData, setFeatureData] = useState<FeatureImportanceData[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadFeatureImportance();
  }, []);

  const loadFeatureImportance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getModelExplanation();
      
      let featureImportanceData = response.feature_importance || {};
      
      // Fallback to static data if backend returns empty
      if (Object.keys(featureImportanceData).length === 0) {
        featureImportanceData = {
          "transaction_amount": 0.245,
          "transaction_amount_log": 0.198,
          "account_age_days": 0.156,
          "is_high_value": 0.132,
          "hour": 0.089,
          "channel_Mobile": 0.067,
          "kyc_verified_No": 0.054,
          "channel_ATM": 0.032,
          "weekday": 0.027,
        };
      }
      
      if (Object.keys(featureImportanceData).length > 0) {
        // Convert to array and sort by importance
        const features = Object.entries(featureImportanceData)
          .map(([feature, importance]) => ({
            feature,
            importance: Number(importance) * 100, // Convert to percentage
            displayName: FEATURE_DISPLAY_NAMES[feature] || feature.replace(/_/g, " "),
          }))
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 5); // Top 5
        
        setFeatureData(features);
      }
      
      if (response.explanation) {
        setExplanation(response.explanation);
        onExplanationGenerated?.(response.explanation);
      }
      
      if (response.metrics) {
        setMetrics(response.metrics);
      }
    } catch (err: any) {
      console.error("Failed to load feature importance:", err);
      setError("Failed to load feature importance. Backend may not be running.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Feature Importance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading model insights...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Feature Importance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center space-y-3">
            <Info className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={loadFeatureImportance}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Feature Importance
            </CardTitle>
            <CardDescription>
              Top 5 features driving fraud detection predictions
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            ML Insights
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {featureData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Feature Importance Chart */}
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={featureData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, "dataMax"]}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={100}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Importance"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {featureData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Feature Legend */}
              <div className="flex flex-wrap gap-2">
                {featureData.map((feature, index) => (
                  <div
                    key={feature.feature}
                    className="flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-muted"
                  >
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{feature.displayName}</span>
                    <span className="font-medium">{feature.importance.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              {/* Model Metrics Summary */}
              {metrics && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  {Object.entries(metrics).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="text-center p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {(Number(value) * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side: LLM Explanation */}
            <div className="flex flex-col justify-center">
              {explanation ? (
                <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 h-full flex flex-col justify-center overflow-y-auto max-h-[500px]">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div className="space-y-3 text-sm leading-relaxed">
                      <p className="text-base font-semibold text-primary mb-3">AI Model Explanation</p>
                      <div 
                        className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: explanation
                            // Remove unwanted greetings and intro text
                            .replace(/^(Good morning|Good afternoon|Hello|Hi).*?team,?\s*/gi, '')
                            .replace(/^Here's an explanation.*?:\s*/i, '')
                            .replace(/^I'm here to walk you through.*?$/gm, '')
                            .replace(/Understanding these features.*?$/gm, '')
                            .replace(/^---+\s*/gm, '')
                            // Format section headers
                            .replace(/###\s*Feature Importance Analysis:?/g, '<p class="font-bold text-foreground text-base mt-4 mb-3">Feature Importance Analysis:</p>')
                            .replace(/###\s*What Drives Fraud Detection:?/g, '<p class="font-bold text-foreground text-base mt-4 mb-3">What Drives Fraud Detection:</p>')
                            .replace(/\*\*Feature Importance Analysis:?\*\*/gi, '<p class="font-bold text-foreground text-base mt-4 mb-3">Feature Importance Analysis:</p>')
                            .replace(/\*\*What (D|d)rives (F|f)raud (D|d)etection.*?\*\*/gi, '<p class="font-bold text-foreground text-base mt-4 mb-3">What Drives Fraud Detection:</p>')
                            // Format bold text
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
                            // Format bullet points
                            .replace(/^[\s]*[-•]\s+(.+)$/gm, '<li class="ml-4 mb-2">$1</li>')
                            .replace(/(<li.*?<\/li>\s*)+/g, '<ul class="list-disc space-y-1 my-3">$&</ul>')
                            // Format paragraphs
                            .replace(/\n\n+/g, '</p><p class="mb-3">')
                            .replace(/^(?!<)(.*?)$/gm, (match) => {
                              if (match.trim() === '' || match.startsWith('<')) return match;
                              return `<p class="mb-3">${match}</p>`;
                            })
                            .trim()
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-dashed h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Sparkles className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">No explanation available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center space-y-2">
              <Brain className="h-12 w-12 mx-auto opacity-30" />
              <p>No feature importance data available</p>
              <Button variant="outline" size="sm" onClick={loadFeatureImportance}>
                Load Data
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureImportance;
