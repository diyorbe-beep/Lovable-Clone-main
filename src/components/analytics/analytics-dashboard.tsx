'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  DollarSign,
  Eye,
  MousePointer,
  Clock,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    totalRevenue: number;
    averageSessionTime: number;
    bounceRate: number;
    conversionRate: number;
    errorRate: number;
  };
  trends: {
    users: Array<{ date: string; count: number; new: number; returning: number }>;
    revenue: Array<{ date: string; amount: number; projected: number }>;
    projects: Array<{ date: string; created: number; completed: number }>;
    performance: Array<{ date: string; responseTime: number; uptime: number; errors: number }>;
  };
  usage: {
    byFeature: Array<{ feature: string; usage: number; growth: number }>;
    byDevice: Array<{ device: string; users: number; percentage: number }>;
    byLocation: Array<{ country: string; users: number; percentage: number }>;
    byTime: Array<{ hour: number; usage: number }>;
  };
  aiMetrics: {
    totalGenerations: number;
    averageResponseTime: number;
    successRate: number;
    costPerGeneration: number;
    popularModels: Array<{ model: string; usage: number; satisfaction: number }>;
    generationTypes: Array<{ type: string; count: number; avgTime: number }>;
  };
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real app, this would come from API
      const mockData: AnalyticsData = {
        overview: {
          totalUsers: 15420,
          activeUsers: 8934,
          totalProjects: 3428,
          totalRevenue: 125680,
          averageSessionTime: 1247, // seconds
          bounceRate: 32.5, // percentage
          conversionRate: 12.8, // percentage
          errorRate: 0.8 // percentage
        },
        trends: {
          users: [
            { date: '2024-01-01', count: 1200, new: 340, returning: 860 },
            { date: '2024-01-02', count: 1350, new: 380, returning: 970 },
            { date: '2024-01-03', count: 1420, new: 420, returning: 1000 },
            { date: '2024-01-04', count: 1580, new: 480, returning: 1100 },
            { date: '2024-01-05', count: 1650, new: 520, returning: 1130 },
            { date: '2024-01-06', count: 1780, new: 580, returning: 1200 },
            { date: '2024-01-07', count: 1890, new: 640, returning: 1250 }
          ],
          revenue: [
            { date: '2024-01-01', amount: 4500, projected: 4800 },
            { date: '2024-01-02', amount: 5200, projected: 5500 },
            { date: '2024-01-03', amount: 6100, projected: 6400 },
            { date: '2024-01-04', amount: 5800, projected: 6200 },
            { date: '2024-01-05', amount: 7200, projected: 7800 },
            { date: '2024-01-06', amount: 8900, projected: 9200 },
            { date: '2024-01-07', amount: 9800, projected: 10500 }
          ],
          projects: [
            { date: '2024-01-01', created: 45, completed: 12 },
            { date: '2024-01-02', created: 52, completed: 18 },
            { date: '2024-01-03', created: 48, completed: 22 },
            { date: '2024-01-04', created: 61, completed: 25 },
            { date: '2024-01-05', created: 58, completed: 28 },
            { date: '2024-01-06', created: 72, completed: 35 },
            { date: '2024-01-07', created: 68, completed: 42 }
          ],
          performance: [
            { date: '2024-01-01', responseTime: 245, uptime: 99.8, errors: 12 },
            { date: '2024-01-02', responseTime: 238, uptime: 99.9, errors: 8 },
            { date: '2024-01-03', responseTime: 252, uptime: 99.7, errors: 15 },
            { date: '2024-01-04', responseTime: 241, uptime: 99.8, errors: 10 },
            { date: '2024-01-05', responseTime: 235, uptime: 99.9, errors: 6 },
            { date: '2024-01-06', responseTime: 248, uptime: 99.6, errors: 18 },
            { date: '2024-01-07', responseTime: 242, uptime: 99.8, errors: 9 }
          ]
        },
        usage: {
          byFeature: [
            { feature: 'AI Chat', usage: 45670, growth: 12.5 },
            { feature: 'Code Generation', usage: 34280, growth: 18.2 },
            { feature: 'Project Management', usage: 28940, growth: 8.7 },
            { feature: 'Collaboration', usage: 19850, growth: 15.3 },
            { feature: 'Analytics', usage: 12460, growth: -2.1 }
          ],
          byDevice: [
            { device: 'Desktop', users: 8934, percentage: 58.0 },
            { device: 'Mobile', users: 4872, percentage: 31.6 },
            { device: 'Tablet', users: 1614, percentage: 10.4 }
          ],
          byLocation: [
            { country: 'United States', users: 6890, percentage: 44.7 },
            { country: 'United Kingdom', users: 2145, percentage: 13.9 },
            { country: 'Germany', users: 1876, percentage: 12.2 },
            { country: 'France', users: 1234, percentage: 8.0 },
            { country: 'Canada', users: 1089, percentage: 7.1 },
            { country: 'Others', users: 2186, percentage: 14.1 }
          ],
          byTime: [
            { hour: 0, usage: 234 },
            { hour: 1, usage: 156 },
            { hour: 2, usage: 89 },
            { hour: 3, usage: 67 },
            { hour: 4, usage: 45 },
            { hour: 5, usage: 78 },
            { hour: 6, usage: 234 },
            { hour: 7, usage: 567 },
            { hour: 8, usage: 892 },
            { hour: 9, usage: 1234 },
            { hour: 10, usage: 1456 },
            { hour: 11, usage: 1678 },
            { hour: 12, usage: 1890 },
            { hour: 13, usage: 1756 },
            { hour: 14, usage: 1634 },
            { hour: 15, usage: 1489 },
            { hour: 16, usage: 1323 },
            { hour: 17, usage: 1567 },
            { hour: 18, usage: 1789 },
            { hour: 19, usage: 1923 },
            { hour: 20, usage: 1654 },
            { hour: 21, usage: 1234 },
            { hour: 22, usage: 876 },
            { hour: 23, usage: 456 }
          ]
        },
        aiMetrics: {
          totalGenerations: 156789,
          averageResponseTime: 1247, // milliseconds
          successRate: 98.7, // percentage
          costPerGeneration: 0.0234, // dollars
          popularModels: [
            { model: 'GPT-4', usage: 45670, satisfaction: 4.8 },
            { model: 'Claude-3', usage: 34280, satisfaction: 4.7 },
            { model: 'Gemini-Pro', usage: 28940, satisfaction: 4.6 },
            { model: 'GPT-3.5-Turbo', usage: 19850, satisfaction: 4.5 }
          ],
          generationTypes: [
            { type: 'Code Generation', count: 45670, avgTime: 2340 },
            { type: 'Text Generation', count: 34280, avgTime: 890 },
            { type: 'Code Refactoring', count: 28940, avgTime: 1560 },
            { type: 'Code Explanation', count: 19850, avgTime: 670 },
            { type: 'Test Generation', count: 12460, avgTime: 1890 }
          ]
        }
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalyticsData();
    setIsRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor your application performance and user behavior</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +12.5% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analyticsData.overview.activeUsers)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +8.2% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +18.7% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(analyticsData.overview.averageSessionTime)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-red-600">
                <ArrowDown className="h-3 w-3 mr-1" />
                -3.2% from last month
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="ai">AI Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.trends.users}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="new" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="returning" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.usage.byDevice}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ device, percentage }) => `${device}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="users"
                      >
                        {analyticsData.usage.byDevice.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatNumber(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage by Time of Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.usage.byTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={analyticsData.trends.revenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="projected" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.usage.byFeature}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="feature" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="usage" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.usage.byLocation}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ country, percentage }) => `${country}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="users"
                      >
                        {analyticsData.usage.byLocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatNumber(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.trends.projects}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="created" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="completed" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(analyticsData.aiMetrics.totalGenerations)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.aiMetrics.averageResponseTime}ms</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.aiMetrics.successRate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost/Generation</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analyticsData.aiMetrics.costPerGeneration)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.aiMetrics.popularModels.map((model) => (
                    <div key={model.model} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{model.model}</span>
                        <Badge variant="outline">{formatNumber(model.usage)}</Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-500">Satisfaction:</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < Math.floor(model.satisfaction) ? 'bg-yellow-400' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm ml-1">{model.satisfaction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.aiMetrics.generationTypes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
