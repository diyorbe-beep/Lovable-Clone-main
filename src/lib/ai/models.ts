export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'grok';
  maxTokens: number;
  costPerToken: number;
  capabilities: string[];
  isAvailable: boolean;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  latency: number;
  metadata?: Record<string, any>;
}

export interface AIRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

// Available AI Models Configuration
export const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 128000,
    costPerToken: 0.00001,
    capabilities: ['code-generation', 'text-generation', 'analysis'],
    isAvailable: true,
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    maxTokens: 8192,
    costPerToken: 0.00003,
    capabilities: ['code-generation', 'text-generation', 'analysis'],
    isAvailable: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    maxTokens: 4096,
    costPerToken: 0.000001,
    capabilities: ['text-generation', 'analysis'],
    isAvailable: true,
  },
  
  // Anthropic Models
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 200000,
    costPerToken: 0.000015,
    capabilities: ['code-generation', 'text-generation', 'analysis', 'reasoning'],
    isAvailable: true,
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    costPerToken: 0.000003,
    capabilities: ['code-generation', 'text-generation', 'analysis'],
    isAvailable: true,
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    maxTokens: 200000,
    costPerToken: 0.00000025,
    capabilities: ['text-generation', 'analysis'],
    isAvailable: true,
  },
  
  // Google Models
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    maxTokens: 32768,
    costPerToken: 0.0000005,
    capabilities: ['text-generation', 'analysis', 'multimodal'],
    isAvailable: true,
  },
  {
    id: 'gemini-pro-vision',
    name: 'Gemini Pro Vision',
    provider: 'google',
    maxTokens: 16384,
    costPerToken: 0.0000025,
    capabilities: ['text-generation', 'analysis', 'multimodal', 'vision'],
    isAvailable: true,
  },
  
  // Grok Models
  {
    id: 'grok-1',
    name: 'Grok 1',
    provider: 'grok',
    maxTokens: 8192,
    costPerToken: 0.000002,
    capabilities: ['text-generation', 'analysis', 'real-time-data'],
    isAvailable: true,
  },
];

// Model selection based on use case
export function selectModelForTask(task: string, budget?: number): AIModel {
  const taskModelMap: Record<string, string[]> = {
    'code-generation': ['gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet'],
    'text-generation': ['gpt-4-turbo', 'claude-3-sonnet', 'gemini-pro'],
    'analysis': ['claude-3-opus', 'gpt-4', 'gemini-pro'],
    'multimodal': ['gemini-pro-vision', 'gpt-4-vision-preview'],
    'real-time': ['grok-1', 'gpt-3.5-turbo'],
    'cost-effective': ['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-pro'],
  };

  const preferredModels = taskModelMap[task] || taskModelMap['text-generation'];
  
  // Filter by budget if provided
  if (budget) {
    const affordableModels = preferredModels
      .map(modelId => AI_MODELS.find(m => m.id === modelId))
      .filter(Boolean)
      .filter(model => model!.costPerToken * 1000 <= budget)
      .sort((a, b) => a!.costPerToken - b!.costPerToken);
    
    if (affordableModels.length > 0) {
      return affordableModels[0]!;
    }
  }

  // Return best available model
  return AI_MODELS.find(m => m.id === preferredModels[0]) || AI_MODELS[0]!;
}

// Token estimation
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Cost calculation
export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const totalTokens = inputTokens + outputTokens;
  return totalTokens * model.costPerToken;
}

// Model performance metrics
export interface ModelMetrics {
  model: string;
  avgLatency: number;
  avgTokensPerSecond: number;
  successRate: number;
  totalRequests: number;
  totalCost: number;
}

export class ModelPerformanceTracker {
  private static metrics: Map<string, ModelMetrics> = new Map();

  static recordRequest(model: string, latency: number, tokens: number, success: boolean, cost: number) {
    const existing = this.metrics.get(model) || {
      model,
      avgLatency: 0,
      avgTokensPerSecond: 0,
      successRate: 0,
      totalRequests: 0,
      totalCost: 0,
    };

    existing.totalRequests++;
    existing.totalCost += cost;
    
    if (success) {
      existing.avgLatency = (existing.avgLatency * (existing.totalRequests - 1) + latency) / existing.totalRequests;
      existing.avgTokensPerSecond = (existing.avgTokensPerSecond * (existing.totalRequests - 1) + (tokens / (latency / 1000))) / existing.totalRequests;
    }
    
    existing.successRate = (existing.successRate * (existing.totalRequests - 1) + (success ? 1 : 0)) / existing.totalRequests;

    this.metrics.set(model, existing);
  }

  static getMetrics(model?: string): ModelMetrics[] {
    if (model) {
      const metric = this.metrics.get(model);
      return metric ? [metric] : [];
    }
    return Array.from(this.metrics.values());
  }

  static getBestModelForTask(task: string): string {
    const taskModels = AI_MODELS.filter(m => m.capabilities.includes(task));
    const modelMetrics = this.getMetrics();
    
    let bestModel = taskModels[0]?.id;
    let bestScore = 0;

    for (const model of taskModels) {
      const metrics = modelMetrics.find(m => m.model === model.id);
      if (metrics) {
        // Score based on success rate, speed, and cost
        const score = (metrics.successRate * 0.4) + 
                     ((1000 / metrics.avgLatency) * 0.3) + 
                     ((1 / model.costPerToken) * 0.3);
        
        if (score > bestScore) {
          bestScore = score;
          bestModel = model.id;
        }
      }
    }

    return bestModel || taskModels[0]?.id || 'gpt-4-turbo';
  }
}
