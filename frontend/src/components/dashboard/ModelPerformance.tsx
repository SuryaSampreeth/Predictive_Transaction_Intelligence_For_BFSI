import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity } from "lucide-react";

interface ModelPerformanceProps {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc?: number;
}

export const ModelPerformance = ({
  accuracy,
  precision,
  recall,
  f1Score,
  rocAuc = 0.7334,
}: ModelPerformanceProps) => {
  const metrics = [
    { label: "Accuracy", value: accuracy },
    { label: "Precision", value: precision },
    { label: "Recall", value: recall },
    { label: "F1-Score", value: f1Score },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Model Performance</CardTitle>
          <Badge className="bg-success text-success-foreground">
            <TrendingUp className="h-3 w-3 mr-1" />
            SMOTE Balanced
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ROC-AUC Score */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-medium">ROC-AUC Score</span>
          </div>
          <span className="text-xl font-bold text-primary">{(rocAuc * 100).toFixed(2)}%</span>
        </div>

        {/* Removed Risk Level Distribution per product request */}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </span>
                <span className="text-lg font-bold">
                  {(metric.value * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${metric.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
