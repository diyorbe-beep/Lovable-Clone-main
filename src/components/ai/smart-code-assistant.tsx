'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Lightbulb, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Bug,
  Shield,
  Rocket,
  Brain,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AI_SERVICE } from '@/lib/ai/ai-service-new';

interface CodeSuggestion {
  id: string;
  type: 'completion' | 'refactor' | 'optimization' | 'fix' | 'security';
  title: string;
  description: string;
  code: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  priority: number;
}

interface AnalysisResult {
  suggestions: CodeSuggestion[];
  metrics: {
    complexity: number;
    maintainability: number;
    security: number;
    performance: number;
    coverage: number;
  };
  summary: {
    totalIssues: number;
    criticalIssues: number;
    improvements: number;
    score: number;
  };
}

export default function SmartCodeAssistant() {
  const [code, setCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CodeSuggestion | null>(null);
  const [activeTab, setActiveTab] = useState('suggestions');
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const analyzeCode = async () => {
    if (!code.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await AI_SERVICE.generateResponse({
        prompt: `Analyze this code and provide smart suggestions for improvement, optimization, and potential issues:\n\n${code}`,
        model: { id: 'gpt-4', provider: 'openai' } as any,
        temperature: 0.3,
      });

      // Parse AI response into structured suggestions
      const suggestions = parseSuggestions(response.content);
      const metrics = calculateMetrics(code, suggestions);
      const summary = generateSummary(suggestions, metrics);

      setAnalysis({
        suggestions,
        metrics,
        summary
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseSuggestions = (aiResponse: string): CodeSuggestion[] => {
    // Mock implementation - in real app, parse structured AI response
    return [
      {
        id: '1',
        type: 'completion',
        title: 'Add error handling',
        description: 'Consider adding try-catch blocks for better error handling',
        code: 'try {\n  // Your code here\n} catch (error) {\n  console.error(error);\n}',
        confidence: 0.85,
        impact: 'medium',
        priority: 1
      },
      {
        id: '2',
        type: 'optimization',
        title: 'Optimize loop performance',
        description: 'Use map() instead of forEach() for better performance',
        code: 'const result = items.map(item => process(item));',
        confidence: 0.92,
        impact: 'high',
        priority: 2
      },
      {
        id: '3',
        type: 'security',
        title: 'Sanitize user input',
        description: 'Add input validation to prevent XSS attacks',
        code: 'const sanitized = DOMPurify.sanitize(userInput);',
        confidence: 0.95,
        impact: 'high',
        priority: 1
      }
    ];
  };

  const calculateMetrics = (code: string, suggestions: CodeSuggestion[]) => {
    // Mock implementation - in real app, calculate actual metrics
    return {
      complexity: Math.random() * 100,
      maintainability: Math.random() * 100,
      security: Math.random() * 100,
      performance: Math.random() * 100,
      coverage: Math.random() * 100
    };
  };

  const generateSummary = (suggestions: CodeSuggestion[], metrics: any) => {
    const criticalIssues = suggestions.filter(s => s.impact === 'high').length;
    const improvements = suggestions.length;
    const score = Math.round((metrics.maintainability + metrics.security + metrics.performance) / 3);

    return {
      totalIssues: suggestions.length,
      criticalIssues,
      improvements,
      score
    };
  };

  const applySuggestion = (suggestion: CodeSuggestion) => {
    if (codeRef.current) {
      // Simple implementation - in real app, apply suggestion intelligently
      codeRef.current.value += '\n\n' + suggestion.code;
      setCode(codeRef.current.value);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'completion':
        return <Code2 className="h-4 w-4" />;
      case 'refactor':
        return <Zap className="h-4 w-4" />;
      case 'optimization':
        return <TrendingUp className="h-4 w-4" />;
      case 'fix':
        return <Bug className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Brain className="h-6 w-6 mr-2 text-indigo-600" />
            Smart Code Assistant
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered code analysis and intelligent suggestions
          </p>
        </div>
        <Button onClick={analyzeCode} disabled={isAnalyzing || !code.trim()}>
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Code
            </>
          )}
        </Button>
      </div>

      {/* Code Input */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Code</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            ref={codeRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here for AI analysis..."
            className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-gray-50 dark:bg-gray-800 resize-none"
          />
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="applied">Applied</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-4">
            <div className="grid gap-4">
              {analysis.suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2">
                          {getSuggestionIcon(suggestion.type)}
                          <Badge variant="outline">{suggestion.type}</Badge>
                        </div>
                        <div>
                          <h4 className="font-medium">{suggestion.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {suggestion.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge className={getImpactColor(suggestion.impact)}>
                              {suggestion.impact} impact
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500">Confidence:</span>
                              <Progress value={suggestion.confidence * 100} className="w-16 h-2" />
                              <span className="text-xs text-gray-500">
                                {Math.round(suggestion.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                        className="ml-4"
                      >
                        Apply
                      </Button>
                    </div>
                    {selectedSuggestion?.id === suggestion.id && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
                          <code>{suggestion.code}</code>
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Complexity</p>
                      <p className="text-2xl font-bold">{Math.round(analysis.metrics.complexity)}</p>
                    </div>
                    <Code2 className="h-8 w-8 text-blue-500" />
                  </div>
                  <Progress value={analysis.metrics.complexity} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Maintainability</p>
                      <p className="text-2xl font-bold">{Math.round(analysis.metrics.maintainability)}</p>
                    </div>
                    <Zap className="h-8 w-8 text-green-500" />
                  </div>
                  <Progress value={analysis.metrics.maintainability} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Security</p>
                      <p className="text-2xl font-bold">{Math.round(analysis.metrics.security)}</p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-500" />
                  </div>
                  <Progress value={analysis.metrics.security} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Performance</p>
                      <p className="text-2xl font-bold">{Math.round(analysis.metrics.performance)}</p>
                    </div>
                    <Rocket className="h-8 w-8 text-orange-500" />
                  </div>
                  <Progress value={analysis.metrics.performance} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Coverage</p>
                      <p className="text-2xl font-bold">{Math.round(analysis.metrics.coverage)}%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-teal-500" />
                  </div>
                  <Progress value={analysis.metrics.coverage} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    <span className={getScoreColor(analysis.summary.score)}>
                      {analysis.summary.score}
                    </span>
                    <span className="text-gray-500">/100</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Overall Code Quality Score</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{analysis.summary.criticalIssues}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Critical Issues</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{analysis.summary.totalIssues}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Issues</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analysis.summary.improvements}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Improvements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applied" className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Applied Suggestions Yet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Applied suggestions will appear here for tracking
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
