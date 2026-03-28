'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Play, 
  Code, 
  Users, 
  BarChart3,
  Zap,
  ArrowRight,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  Star,
  Rocket,
  Target,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    primary?: boolean;
  };
  skipable?: boolean;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  user?: {
    name: string;
    email: string;
  };
}

export default function OnboardingFlow({ 
  isOpen, 
  onComplete, 
  onSkip, 
  user 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Lovable AI!',
      description: 'Let\'s get you started with the most powerful AI development platform',
      icon: <Rocket className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <Zap className="h-10 w-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Hi {user?.name || 'Developer'}! 👋</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to the future of AI-powered development. We\'re excited to have you on board!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Code className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-gray-700 dark:text-gray-300">AI Code Generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-gray-700 dark:text-gray-300">Real-time Collaboration</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-gray-700 dark:text-gray-300">Advanced Analytics</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">What you get with your free account:</h4>
            <ul className="space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                100 free AI generations per month
              </li>
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                Access to all AI models
              </li>
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                Real-time collaboration features
              </li>
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                5 projects with unlimited storage
              </li>
            </ul>
          </div>
        </div>
      ),
      skipable: false,
    },
    {
      id: 'create-project',
      title: 'Create Your First Project',
      description: 'Start by creating a new project to explore our AI-powered features',
      icon: <Code className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
              <Code className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start Building Amazing Projects</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create your first project and experience the power of AI-assisted development
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h4 className="font-medium mb-4">Why create a project?</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h5 className="font-medium">AI-Powered Development</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generate, refactor, and explain code with advanced AI models
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h5 className="font-medium">Real-time Collaboration</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Work together with your team in real-time with live editing
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h5 className="font-medium">Smart Analytics</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track your progress and optimize your development workflow
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Popular Frameworks</div>
              <div className="flex space-x-2">
                <Badge variant="outline">React</Badge>
                <Badge variant="outline">Vue</Badge>
                <Badge variant="outline">Angular</Badge>
                <Badge variant="outline">Next.js</Badge>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'Create Your First Project',
        onClick: () => {
          // Navigate to project creation
          window.location.href = '/projects/create';
        },
        primary: true,
      },
    },
    {
      id: 'ai-assistant',
      title: 'Meet Your AI Assistant',
      description: 'Our AI can help you generate code, refactor, explain, and much more',
      icon: <Zap className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your AI Development Partner</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Experience the power of multiple AI models working together to accelerate your development
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Code className="h-4 w-4 mr-2 text-blue-600" />
                  Code Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Generate complete applications, components, and utilities with natural language
                </p>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-green-600" />
                  Code Explanation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Understand complex code with detailed explanations and examples
                </p>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Target className="h-4 w-4 mr-2 text-purple-600" />
                  Code Refactoring
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Improve code quality and performance with intelligent refactoring
                </p>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-600" />
                  Test Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically generate comprehensive tests for your code
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Available AI Models:</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">GPT-4</Badge>
              <Badge variant="secondary">Claude-3</Badge>
              <Badge variant="secondary">Gemini Pro</Badge>
              <Badge variant="secondary">GPT-3.5 Turbo</Badge>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'Try AI Assistant',
        onClick: () => {
          window.location.href = '/ai';
        },
        primary: true,
      },
    },
    {
      id: 'collaboration',
      title: 'Collaborate with Your Team',
      description: 'Work together in real-time with built-in collaboration features',
      icon: <Users className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Teamwork Made Simple</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Collaborate seamlessly with your team, no matter where they are
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Real-time Editing</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  See changes as they happen with live cursors and selections
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Live Comments</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discuss code with threaded comments and mentions
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Version Control</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track changes and maintain code quality with built-in version control
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Perfect for Teams:</h4>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                Remote teams working across time zones
              </li>
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                Pair programming and code reviews
              </li>
              <li className="flex items-center">
                <Check className="h-3 w-3 mr-2" />
                Mentoring and knowledge sharing
              </li>
            </ul>
          </div>
        </div>
      ),
      action: {
        label: 'Explore Collaboration',
        onClick: () => {
          window.location.href = '/collaboration';
        },
        primary: true,
      },
    },
    {
      id: 'analytics',
      title: 'Track Your Progress',
      description: 'Monitor your usage and analytics to optimize your workflow',
      icon: <BarChart3 className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Data-Driven Development</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Make informed decisions with comprehensive analytics and insights
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">100+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">AI Generations</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">5</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">2.5h</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Session</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">98%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Code Quality</span>
              </div>
              <span className="text-sm text-green-600">Excellent</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Productivity</span>
              </div>
              <span className="text-sm text-blue-600">High</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">Collaboration</span>
              </div>
              <span className="text-sm text-purple-600">Active</span>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'View Analytics Dashboard',
        onClick: () => {
          window.location.href = '/analytics';
        },
        primary: true,
      },
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'You\'re ready to start building amazing projects with AI',
      icon: <Star className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <Star className="h-10 w-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Congratulations! 🎉</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You\'re ready to start building amazing projects with AI
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-4">What's Next?</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h5 className="font-medium">Create Projects</h5>
                <p className="text-gray-600 dark:text-gray-400">Build amazing applications</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h5 className="font-medium">Use AI Assistant</h5>
                <p className="text-gray-600 dark:text-gray-400">Accelerate development</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h5 className="font-medium">Collaborate</h5>
                <p className="text-gray-600 dark:text-gray-400">Work with your team</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.href = '/dashboard'} className="w-full sm:w-auto">
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/docs'} className="w-full sm:w-auto">
              <Play className="h-4 w-4 mr-2" />
              Watch Tutorial
            </Button>
          </div>
        </div>
      ),
      skipable: false,
    },
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsCompleted(false);
      setSkippedSteps([]);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    const currentStepId = steps[currentStep].id;
    setSkippedSteps([...skippedSteps, currentStepId]);
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  const handleStepAction = () => {
    const step = steps[currentStep];
    if (step.action) {
      step.action.onClick();
    }
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {currentStepData.icon}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentStepData.description}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {currentStepData.content}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              
              {currentStepData.skipable && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-600 dark:text-gray-400"
                >
                  Skip
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {currentStepData.action && (
                <Button
                  onClick={handleStepAction}
                  primary={currentStepData.action.primary}
                  className="flex items-center"
                >
                  {currentStepData.action.label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {!currentStepData.action && (
                <Button
                  onClick={handleNext}
                  className="flex items-center"
                >
                  {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
