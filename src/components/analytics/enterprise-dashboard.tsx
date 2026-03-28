'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  BarChart3, 
  PieChart, 
  Download,
  Filter,
  Calendar,
  Target,
  Zap,
  Shield,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Settings,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface EnterpriseMetrics {
  overview: {
    totalRevenue: number;
    activeUsers: number;
    enterpriseClients: number;
    customerSatisfaction: number;
    churnRate: number;
    averageDealSize: number;
    marketShare: number;
    growthRate: number;
  };
  revenue: {
    monthly: Array<{ month: string; revenue: number; projected: number; actual: number }>;
    bySegment: Array<{ segment: string; revenue: number; growth: number }>;
    byProduct: Array<{ product: string; revenue: number; customers: number }>;
    forecast: Array<{ period: string; lower: number; expected: number; upper: number }>;
  };
  customers: {
    acquisition: Array<{ channel: string; customers: number; cost: number; roi: number }>;
    retention: Array<{ cohort: string; retained: number; total: number; rate: number }>;
    segments: Array<{ segment: string; count: number; revenue: number; satisfaction: number }>;
    geography: Array<{ country: string; customers: number; revenue: number; growth: number }>;
  };
  operations: {
    performance: Array<{ metric: string; current: number; target: number; trend: 'up' | 'down' | 'stable' }>;
    efficiency: Array<{ process: string; efficiency: number; cost: number; time: number }>;
    quality: Array<{ category: string; score: number; issues: number; resolved: number }>;
    resources: Array<{ resource: string; utilized: number; available: number; cost: number }>;
  };
  predictive: {
    churnRisk: Array<{ customer: string; risk: number; factors: string[] }>;
    revenueForecast: Array<{ month: string; predicted: number; confidence: number }>;
    marketTrends: Array<{ trend: string; impact: number; probability: number }>;
    opportunities: Array<{ opportunity: string; value: number; probability: number; timeline: string }>;
  };
}

export default function EnterpriseDashboard() {
  const [metrics, setMetrics] = useState<EnterpriseMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y' | 'all'>('90d');
  const [selectedSegment, setSelectedSegment] = useState('all');

  useEffect(() => {
    loadEnterpriseMetrics();
  }, [selectedPeriod, selectedSegment]);

  const loadEnterpriseMetrics = async () => {
    setIsLoading(true);
    try {
      // Mock enterprise data
      const mockMetrics: EnterpriseMetrics = {
        overview: {
          totalRevenue: 2847500,
          activeUsers: 48500,
          enterpriseClients: 127,
          customerSatisfaction: 94.2,
          churnRate: 2.8,
          averageDealSize: 45000,
          marketShare: 12.4,
          growthRate: 23.5
        },
        revenue: {
          monthly: [
            { month: 'Jan', revenue: 180000, projected: 175000, actual: 182000 },
            { month: 'Feb', revenue: 195000, projected: 190000, actual: 198000 },
            { month: 'Mar', revenue: 210000, projected: 205000, actual: 215000 },
            { month: 'Apr', revenue: 225000, projected: 220000, actual: 228000 },
            { month: 'May', revenue: 240000, projected: 235000, actual: 245000 },
            { month: 'Jun', revenue: 265000, projected: 250000, actual: 268000 }
          ],
          bySegment: [
            { segment: 'Enterprise', revenue: 1850000, growth: 28.5 },
            { segment: 'Mid-Market', revenue: 680000, growth: 18.2 },
            { segment: 'SMB', revenue: 317500, growth: 12.8 }
          ],
          byProduct: [
            { product: 'AI Platform', revenue: 1250000, customers: 89 },
            { product: 'Analytics Suite', revenue: 980000, customers: 156 },
            { product: 'Collaboration Tools', revenue: 617500, customers: 234 }
          ],
          forecast: [
            { period: 'Q3', lower: 750000, expected: 820000, upper: 890000 },
            { period: 'Q4', lower: 880000, expected: 950000, upper: 1020000 },
            { period: 'Q1 2025', lower: 920000, expected: 1050000, upper: 1180000 }
          ]
        },
        customers: {
          acquisition: [
            { channel: 'Direct Sales', customers: 45, cost: 12000, roi: 3.8 },
            { channel: 'Partners', customers: 28, cost: 8000, roi: 4.2 },
            { channel: 'Digital Marketing', customers: 67, cost: 15000, roi: 2.9 },
            { channel: 'Referrals', customers: 23, cost: 3000, roi: 6.1 }
          ],
          retention: [
            { cohort: 'Q1 2024', retained: 112, total: 120, rate: 93.3 },
            { cohort: 'Q4 2023', retained: 98, total: 105, rate: 93.3 },
            { cohort: 'Q3 2023', retained: 87, total: 95, rate: 91.6 },
            { cohort: 'Q2 2023', retained: 78, total: 88, rate: 88.6 }
          ],
          segments: [
            { segment: 'Fortune 500', count: 23, revenue: 1250000, satisfaction: 96.2 },
            { segment: 'Mid-Market', count: 67, revenue: 980000, satisfaction: 93.8 },
            { segment: 'SMB', count: 37, revenue: 317500, satisfaction: 91.5 }
          ],
          geography: [
            { country: 'United States', customers: 68, revenue: 1680000, growth: 22.3 },
            { country: 'United Kingdom', customers: 24, revenue: 580000, growth: 18.7 },
            { country: 'Germany', customers: 18, revenue: 420000, growth: 15.2 },
            { country: 'Canada', customers: 11, revenue: 267500, growth: 12.8 },
            { country: 'Others', customers: 6, revenue: 180000, growth: 8.4 }
          ]
        },
        operations: {
          performance: [
            { metric: 'Sales Cycle', current: 42, target: 35, trend: 'down' },
            { metric: 'Deal Size', current: 45000, target: 50000, trend: 'up' },
            { metric: 'Win Rate', current: 68, target: 75, trend: 'up' },
            { metric: 'Customer Acquisition', current: 163, target: 200, trend: 'stable' }
          ],
          efficiency: [
            { process: 'Sales Process', efficiency: 87, cost: 45000, time: 42 },
            { process: 'Customer Onboarding', efficiency: 92, cost: 12000, time: 14 },
            { process: 'Support Operations', efficiency: 78, cost: 28000, time: 24 },
            { process: 'Product Development', efficiency: 85, cost: 125000, time: 90 }
          ],
          quality: [
            { category: 'Product Quality', score: 94, issues: 12, resolved: 11 },
            { category: 'Service Quality', score: 91, issues: 8, resolved: 8 },
            { category: 'Support Quality', score: 88, issues: 15, resolved: 13 },
            { category: 'Documentation', score: 86, issues: 6, resolved: 5 }
          ],
          resources: [
            { resource: 'Sales Team', utilized: 89, available: 100, cost: 1250000 },
            { resource: 'Support Team', utilized: 76, available: 100, cost: 680000 },
            { resource: 'Engineering', utilized: 92, available: 100, cost: 2100000 },
            { resource: 'Marketing', utilized: 71, available: 100, cost: 450000 }
          ]
        },
        predictive: {
          churnRisk: [
            { customer: 'Acme Corp', risk: 78, factors: ['Usage Decline', 'Support Tickets', 'Payment Issues'] },
            { customer: 'Global Tech', risk: 65, factors: ['Usage Decline', 'Feature Adoption'] },
            { customer: 'Innovate LLC', risk: 52, factors: ['Support Tickets', 'Contract Renewal'] }
          ],
          revenueForecast: [
            { month: 'Jul', predicted: 285000, confidence: 0.87 },
            { month: 'Aug', predicted: 298000, confidence: 0.82 },
            { month: 'Sep', predicted: 312000, confidence: 0.78 },
            { month: 'Oct', predicted: 325000, confidence: 0.75 }
          ],
          marketTrends: [
            { trend: 'AI Adoption', impact: 85, probability: 0.92 },
            { trend: 'Remote Work', impact: 72, probability: 0.88 },
            { trend: 'Digital Transformation', impact: 78, probability: 0.85 },
            { trend: 'Sustainability Focus', impact: 45, probability: 0.67 }
          ],
          opportunities: [
            { opportunity: 'Healthcare Sector', value: 450000, probability: 0.78, timeline: 'Q3 2024' },
            { opportunity: 'Financial Services', value: 680000, probability: 0.65, timeline: 'Q4 2024' },
            { opportunity: 'Government Contracts', value: 1200000, probability: 0.45, timeline: 'Q1 2025' }
          ]
        }
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load enterprise metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (isLoading || !metrics) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced business intelligence and predictive analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +{metrics.overview.growthRate}% from last period
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enterprise Clients</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.overview.enterpriseClients)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +12 this quarter
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.customerSatisfaction}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +2.3% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Share</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.marketShare}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-green-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                +1.8% from last year
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.revenue.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Area type="monotone" dataKey="actual" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="projected" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Segment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={metrics.revenue.bySegment}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ segment, revenue }) => `${segment}: ${formatCurrency(revenue)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {metrics.revenue.bySegment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.revenue.forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="lower" stroke="#ff7300" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="expected" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="upper" stroke="#00ff00" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.customers.acquisition.map((channel, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{channel.channel}</p>
                        <p className="text-sm text-gray-500">{channel.customers} customers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(channel.cost)}</p>
                        <p className="text-sm text-green-600">ROI: {channel.roi}x</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.customers.retention}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cohort" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.customers.geography}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.operations.performance.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{metric.metric}</span>
                        {metric.trend === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
                        {metric.trend === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
                        {metric.trend === 'stable' && <div className="h-4 w-4 bg-gray-400 rounded-full" />}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{metric.current}</p>
                        <p className="text-sm text-gray-500">Target: {metric.target}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.operations.resources.map((resource, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{resource.resource}</span>
                        <span className="text-sm text-gray-500">{resource.utilized}% utilized</span>
                      </div>
                      <Progress value={resource.utilized} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span>{resource.utilized}/{resource.available}</span>
                        <span>{formatCurrency(resource.cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Churn Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.predictive.churnRisk.map((customer, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{customer.customer}</span>
                        <Badge variant={customer.risk > 70 ? 'destructive' : customer.risk > 40 ? 'default' : 'secondary'}>
                          {customer.risk}% risk
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {customer.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.predictive.revenueForecast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Line type="monotone" dataKey="predicted" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Growth Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.predictive.opportunities.map((opportunity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{opportunity.opportunity}</p>
                      <p className="text-sm text-gray-500">{opportunity.timeline}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(opportunity.value)}</p>
                      <p className="text-sm text-gray-500">{Math.round(opportunity.probability * 100)}% probability</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <FileText className="h-8 w-8 text-blue-500 mb-2" />
                  <h4 className="font-medium">Executive Summary</h4>
                  <p className="text-sm text-gray-500 mt-1">High-level overview for leadership</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Generate
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <BarChart3 className="h-8 w-8 text-green-500 mb-2" />
                  <h4 className="font-medium">Sales Performance</h4>
                  <p className="text-sm text-gray-500 mt-1">Detailed sales metrics and KPIs</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Generate
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <Users className="h-8 w-8 text-purple-500 mb-2" />
                  <h4 className="font-medium">Customer Analysis</h4>
                  <p className="text-sm text-gray-500 mt-1">Customer behavior and retention</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Generate
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <Target className="h-8 w-8 text-orange-500 mb-2" />
                  <h4 className="font-medium">Financial Report</h4>
                  <p className="text-sm text-gray-500 mt-1">Revenue and cost analysis</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Generate
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <Zap className="h-8 w-8 text-yellow-500 mb-2" />
                  <h4 className="font-medium">Operations Report</h4>
                  <p className="text-sm text-gray-500 mt-1">Operational efficiency metrics</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Generate
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <Shield className="h-8 w-8 text-red-500 mb-2" />
                  <h4 className="font-medium">Risk Assessment</h4>
                  <p className="text-sm text-gray-500 mt-1">Risk analysis and mitigation</p>
                  <Button className="mt-3 w-full" variant="outline">
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
