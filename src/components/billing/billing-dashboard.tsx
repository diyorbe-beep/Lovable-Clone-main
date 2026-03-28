'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Users, 
  Zap, 
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface BillingData {
  currentPlan: {
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    features: string[];
    usageLimit: number;
    currentUsage: number;
  };
  usage: {
    aiGenerations: {
      used: number;
      limit: number;
      cost: number;
    };
    apiCalls: {
      used: number;
      limit: number;
      cost: number;
    };
    storage: {
      used: number;
      limit: number;
      cost: number;
    };
    bandwidth: {
      used: number;
      limit: number;
      cost: number;
    };
  };
  billing: {
    currentMonth: number;
    lastMonth: number;
    projected: number;
    trend: 'up' | 'down';
    invoices: Array<{
      id: string;
      date: Date;
      amount: number;
      status: 'paid' | 'pending' | 'failed';
      description: string;
    }>;
  };
  metrics: {
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    usageByCategory: Array<{ category: string; usage: number; cost: number }>;
    subscriptionGrowth: Array<{ month: string; subscribers: number }>;
  };
}

export default function BillingDashboard() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadBillingData();
  }, [selectedPeriod]);

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real app, this would come from API
      const mockData: BillingData = {
        currentPlan: {
          name: 'Pro Plan',
          price: 99,
          interval: 'monthly',
          features: [
            'Unlimited AI generations',
            'Advanced analytics',
            'Priority support',
            'Custom integrations',
            'Advanced security features'
          ],
          usageLimit: 100000,
          currentUsage: 75000
        },
        usage: {
          aiGenerations: {
            used: 75000,
            limit: 100000,
            cost: 45.50
          },
          apiCalls: {
            used: 2500000,
            limit: 5000000,
            cost: 12.50
          },
          storage: {
            used: 75,
            limit: 100,
            cost: 7.50
          },
          bandwidth: {
            used: 850,
            limit: 1000,
            cost: 8.50
          }
        },
        billing: {
          currentMonth: 156.75,
          lastMonth: 142.30,
          projected: 168.00,
          trend: 'up',
          invoices: [
            {
              id: 'inv_001',
              date: new Date('2024-01-15'),
              amount: 99.00,
              status: 'paid',
              description: 'Pro Plan - Monthly'
            },
            {
              id: 'inv_002',
              date: new Date('2024-02-15'),
              amount: 99.00,
              status: 'paid',
              description: 'Pro Plan - Monthly'
            },
            {
              id: 'inv_003',
              date: new Date('2024-03-15'),
              amount: 156.75,
              status: 'pending',
              description: 'Pro Plan + Usage'
            }
          ]
        },
        metrics: {
          monthlyRevenue: [
            { month: 'Jan', revenue: 4500 },
            { month: 'Feb', revenue: 5200 },
            { month: 'Mar', revenue: 6100 },
            { month: 'Apr', revenue: 5800 },
            { month: 'May', revenue: 7200 },
            { month: 'Jun', revenue: 8900 }
          ],
          usageByCategory: [
            { category: 'AI Generations', usage: 75000, cost: 45.50 },
            { category: 'API Calls', usage: 2500000, cost: 12.50 },
            { category: 'Storage', usage: 75, cost: 7.50 },
            { category: 'Bandwidth', usage: 850, cost: 8.50 }
          ],
          subscriptionGrowth: [
            { month: 'Jan', subscribers: 120 },
            { month: 'Feb', subscribers: 145 },
            { month: 'Mar', subscribers: 178 },
            { month: 'Apr', subscribers: 195 },
            { month: 'May', subscribers: 220 },
            { month: 'Jun', subscribers: 267 }
          ]
        }
      };
      
      setBillingData(mockData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading || !billingData) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor your usage and billing</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billingData.billing.currentMonth)}</div>
            <p className="text-xs text-muted-foreground">
              {billingData.billing.trend === 'up' ? (
                <span className="flex items-center text-red-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{((billingData.billing.currentMonth - billingData.billing.lastMonth) / billingData.billing.lastMonth * 100).toFixed(1)}%
                </span>
              ) : (
                <span className="flex items-center text-green-600">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  -{((billingData.billing.lastMonth - billingData.billing.currentMonth) / billingData.billing.lastMonth * 100).toFixed(1)}%
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billingData.billing.projected)}</div>
            <p className="text-xs text-muted-foreground">
              Based on current usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(billingData.usage.aiGenerations.used)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(billingData.usage.aiGenerations.cost)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(billingData.usage.apiCalls.used)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(billingData.usage.apiCalls.cost)} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Current Plan: {billingData.currentPlan.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Plan Cost</span>
                <span className="text-lg font-bold">{formatCurrency(billingData.currentPlan.price)}/{billingData.currentPlan.interval}</span>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Features:</h4>
                <ul className="space-y-1">
                  {billingData.currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Usage Limit</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatNumber(billingData.currentPlan.currentUsage)} / {formatNumber(billingData.currentPlan.usageLimit)}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(billingData.currentPlan.currentUsage, billingData.currentPlan.usageLimit)} 
                className="h-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {getUsagePercentage(billingData.currentPlan.currentUsage, billingData.currentPlan.usageLimit).toFixed(1)}% used
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">AI Generations</span>
                  <span className={`text-sm ${getUsageColor(getUsagePercentage(billingData.usage.aiGenerations.used, billingData.usage.aiGenerations.limit))}`}>
                    {formatNumber(billingData.usage.aiGenerations.used)} / {formatNumber(billingData.usage.aiGenerations.limit)}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(billingData.usage.aiGenerations.used, billingData.usage.aiGenerations.limit)} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(billingData.usage.aiGenerations.cost)}</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">API Calls</span>
                  <span className={`text-sm ${getUsageColor(getUsagePercentage(billingData.usage.apiCalls.used, billingData.usage.apiCalls.limit))}`}>
                    {formatNumber(billingData.usage.apiCalls.used)} / {formatNumber(billingData.usage.apiCalls.limit)}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(billingData.usage.apiCalls.used, billingData.usage.apiCalls.limit)} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(billingData.usage.apiCalls.cost)}</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Storage</span>
                  <span className={`text-sm ${getUsageColor(getUsagePercentage(billingData.usage.storage.used, billingData.usage.storage.limit))}`}>
                    {billingData.usage.storage.used}GB / {billingData.usage.storage.limit}GB
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(billingData.usage.storage.used, billingData.usage.storage.limit)} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(billingData.usage.storage.cost)}</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bandwidth</span>
                  <span className={`text-sm ${getUsageColor(getUsagePercentage(billingData.usage.bandwidth.used, billingData.usage.bandwidth.limit))}`}>
                    {billingData.usage.bandwidth.used}GB / {billingData.usage.bandwidth.limit}GB
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(billingData.usage.bandwidth.used, billingData.usage.bandwidth.limit)} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(billingData.usage.bandwidth.cost)}</p>
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={billingData.metrics.usageByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, cost }) => `${category}: ${formatCurrency(cost)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cost"
                  >
                    {billingData.metrics.usageByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={billingData.metrics.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={billingData.metrics.subscriptionGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="subscribers" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingData.billing.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{invoice.date.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <p className="font-medium">{invoice.description}</p>
                    <p className="text-sm text-gray-500">ID: {invoice.id}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{formatCurrency(invoice.amount)}</span>
                  <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'pending' ? 'secondary' : 'destructive'}>
                    {invoice.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
