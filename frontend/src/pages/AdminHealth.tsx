import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  api_latency: number;
  requests_per_minute: number;
}

interface BackgroundJob {
  job_id: string;
  name: string;
  status: "running" | "completed" | "failed" | "pending";
  progress: number;
  started_at: string;
  completed_at?: string;
}

interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "locked";
  last_login: string;
}

const AdminHealth = () => {
  // System Health
  const { data: systemHealth } = useQuery({
    queryKey: ["system-health"],
    queryFn: async (): Promise<SystemMetrics> => ({
      cpu_usage: Math.random() * 60 + 20,
      memory_usage: Math.random() * 50 + 30,
      disk_usage: Math.random() * 40 + 40,
      api_latency: Math.random() * 100 + 50,
      requests_per_minute: Math.floor(Math.random() * 500) + 100,
    }),
    refetchInterval: 5000,
  });

  // Performance History
  const { data: performanceHistory } = useQuery({
    queryKey: ["performance-history"],
    queryFn: async () => {
      return Array.from({ length: 20 }, (_, i) => ({
        time: `${20 - i}m`,
        cpu: Math.random() * 60 + 20,
        memory: Math.random() * 50 + 30,
        latency: Math.random() * 100 + 50,
      }));
    },
  });

  // Background Jobs
  const { data: backgroundJobs } = useQuery({
    queryKey: ["background-jobs"],
    queryFn: async (): Promise<BackgroundJob[]> => [
      {
        job_id: "JOB001",
        name: "Daily Fraud Report Generation",
        status: "completed",
        progress: 100,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        job_id: "JOB002",
        name: "Model Retraining",
        status: "running",
        progress: 65,
        started_at: new Date(Date.now() - 1200000).toISOString(),
      },
      {
        job_id: "JOB003",
        name: "Database Backup",
        status: "pending",
        progress: 0,
        started_at: new Date(Date.now() + 600000).toISOString(),
      },
    ],
    refetchInterval: 3000,
  });

  // User Management
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserAccount[]> => [
      {
        id: "USR001",
        username: "admin",
        email: "admin@example.com",
        role: "Administrator",
        status: "active",
        last_login: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "USR002",
        username: "analyst1",
        email: "analyst1@example.com",
        role: "Analyst",
        status: "active",
        last_login: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "USR003",
        username: "manager1",
        email: "manager1@example.com",
        role: "Manager",
        status: "active",
        last_login: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: "USR004",
        username: "auditor",
        email: "auditor@example.com",
        role: "Auditor",
        status: "inactive",
        last_login: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  });

  // Service Status
  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => [
      { name: "FastAPI Backend", status: "healthy", uptime: "99.9%", latency: 45 },
      { name: "MongoDB Atlas", status: "healthy", uptime: "100%", latency: 28 },
      { name: "Gemini API", status: "healthy", uptime: "99.7%", latency: 120 },
      { name: "Redis Cache", status: "healthy", uptime: "99.8%", latency: 5 },
    ],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "running":
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
      case "inactive":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "locked":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
      case "completed":
        return "bg-green-100 text-green-800";
      case "running":
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
      case "inactive":
        return "bg-red-100 text-red-800";
      case "locked":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getResourceColor = (value: number) => {
    if (value >= 80) return "bg-red-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <AppShell
      title="Admin & System Health"
      subtitle="System monitoring, user management, and service status"
    >
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="services">Service Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{(systemHealth?.cpu_usage ?? 0).toFixed(1)}%</p>
                  <Progress
                    value={systemHealth?.cpu_usage || 0}
                    className={getResourceColor(systemHealth?.cpu_usage || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{(systemHealth?.memory_usage ?? 0).toFixed(1)}%</p>
                  <Progress
                    value={systemHealth?.memory_usage || 0}
                    className={getResourceColor(systemHealth?.memory_usage || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Disk Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{(systemHealth?.disk_usage ?? 0).toFixed(1)}%</p>
                  <Progress
                    value={systemHealth?.disk_usage || 0}
                    className={getResourceColor(systemHealth?.disk_usage || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  API Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{(systemHealth?.api_latency ?? 0).toFixed(0)}ms</p>
                <p className="text-sm text-muted-foreground">Avg response time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Requests/min
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{systemHealth?.requests_per_minute ?? 0}</p>
                <p className="text-sm text-muted-foreground">Current throughput</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} name="Memory %" />
                  <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Background Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {backgroundJobs?.map((job) => (
                    <Card key={job.job_id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusIcon(job.status)}
                                <span className="font-medium">{job.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground font-mono">{job.job_id}</p>
                            </div>
                            <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                          </div>

                          {job.status === "running" && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-medium">{job.progress}%</span>
                              </div>
                              <Progress value={job.progress} />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Started:</span>
                              <p>{new Date(job.started_at).toLocaleString()}</p>
                            </div>
                            {job.completed_at && (
                              <div>
                                <span className="text-muted-foreground">Completed:</span>
                                <p>{new Date(job.completed_at).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(user.status)}
                          <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.last_login).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="ghost">Reset</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services?.map((service) => (
                  <Card key={service.name}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(service.status)}
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">Uptime: {service.uptime}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(service.status)}>{service.status}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">Latency: {service.latency}ms</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default AdminHealth;
