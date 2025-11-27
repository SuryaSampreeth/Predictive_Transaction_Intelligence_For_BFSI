import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  fetchFeatureImportance,
  fetchTrainingJobs,
  fetchTrainingJob,
  startModelTraining,
  explainModel,
  fetchModelMetrics,
} from "@/services/api";
import { Brain, Play, TrendingUp, Sparkles, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const ModelingWorkspace = () => {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const featureQuery = useQuery({
    queryKey: ["feature-importance"],
    queryFn: fetchFeatureImportance,
  });

  const jobsQuery = useQuery({
    queryKey: ["training-jobs"],
    queryFn: fetchTrainingJobs,
    refetchInterval: 5000,
  });

  const jobDetailQuery = useQuery({
    queryKey: ["training-job", selectedJob],
    queryFn: () => fetchTrainingJob(selectedJob!),
    enabled: !!selectedJob,
    refetchInterval: selectedJob ? 3000 : false,
  });

  const explanationQuery = useQuery({
    queryKey: ["model-explanation"],
    queryFn: explainModel,
  });

  const metricsQuery = useQuery({
    queryKey: ["model-metrics"],
    queryFn: fetchModelMetrics,
  });

  const trainingMutation = useMutation({
    mutationFn: startModelTraining,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-jobs"] });
      setSelectedJob(data.job_id);
      toast.success("Training job started");
    },
  });

  const features = featureQuery.data?.features || {};
  const jobs = jobsQuery.data || [];
  const jobDetail = jobDetailQuery.data;
  const explanation = explanationQuery.data;
  const metrics = metricsQuery.data;

  const featureData = Object.entries(features)
    .map(([name, importance]) => ({
      name: name.replace(/_/g, " "),
      importance: (importance as number) * 100,
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  const handleStartTraining = () => {
    trainingMutation.mutate({
      model_type: "xgboost",
      hyperparameters: {
        max_depth: 6,
        learning_rate: 0.1,
        n_estimators: 100,
      },
      validation_split: 0.2,
    });
  };

  return (
    <AppShell
      title="Predictive Modeling Workspace"
      subtitle="Model training, evaluation, and explainability"
      actions={
        <Button size="sm" onClick={handleStartTraining} disabled={trainingMutation.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {trainingMutation.isPending ? "Starting..." : "Start Training"}
        </Button>
      }
    >
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training Jobs</TabsTrigger>
          <TabsTrigger value="features">Feature Importance</TabsTrigger>
          <TabsTrigger value="explainability">Explainability</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Version</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">v1.0.0</p>
                <p className="text-sm text-muted-foreground">Active production model</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics?.accuracy ? ((metrics.accuracy ?? 0) * 100).toFixed(1) : "--"}%</p>
                <p className="text-sm text-muted-foreground">On validation set</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Training Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">Total runs</p>
              </CardContent>
            </Card>
          </div>

          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className="text-2xl font-bold">{((metrics.accuracy ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precision</p>
                    <p className="text-2xl font-bold">{((metrics.precision ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recall</p>
                    <p className="text-2xl font-bold">{((metrics.recall ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">F1 Score</p>
                    <p className="text-2xl font-bold">{((metrics.f1_score ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Training Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {jobs.map((job: any) => (
                      <div
                        key={job.job_id}
                        onClick={() => setSelectedJob(job.job_id)}
                        className={`p-3 rounded-lg border cursor-pointer ${
                          selectedJob === job.job_id ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm">{job.job_id}</span>
                          <Badge variant={job.status === "completed" ? "default" : job.status === "running" ? "secondary" : "outline"}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{job.model_type}</p>
                        {job.status === "running" && (
                          <Progress value={job.progress} className="mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedJob ? (
                  <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                    <div className="text-center">
                      <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p>Select a training job to view details</p>
                    </div>
                  </div>
                ) : jobDetail ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Job ID</Label>
                        <p className="font-mono">{jobDetail.job_id}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge>{jobDetail.status}</Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Model Type</Label>
                        <p className="capitalize">{jobDetail.model_type}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Progress</Label>
                        <div className="space-y-1">
                          <Progress value={jobDetail.progress} />
                          <p className="text-xs text-muted-foreground">{jobDetail.progress}%</p>
                        </div>
                      </div>
                    </div>

                    {jobDetail.metrics && (
                      <Card className="bg-muted/50">
                        <CardHeader>
                          <CardTitle className="text-base">Training Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Accuracy</p>
                              <p className="text-xl font-bold">{((jobDetail.metrics.accuracy ?? 0) * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Precision</p>
                              <p className="text-xl font-bold">{((jobDetail.metrics.precision ?? 0) * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Recall</p>
                              <p className="text-xl font-bold">{((jobDetail.metrics.recall ?? 0) * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">F1 Score</p>
                              <p className="text-xl font-bold">{((jobDetail.metrics.f1_score ?? 0) * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Importance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={featureData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explainability" className="space-y-4">
          {explanation ? (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI Model Explanation
                </CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap">
                {explanation.explanation}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Top Contributing Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {featureData.slice(0, 5).map((feature) => (
                  <div key={feature.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize">{feature.name}</span>
                      <span className="text-sm font-medium">{feature.importance.toFixed(1)}%</span>
                    </div>
                    <Progress value={feature.importance} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default ModelingWorkspace;
