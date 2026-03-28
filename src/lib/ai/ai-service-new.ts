import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { GoogleProvider } from './providers/google-provider';
import { AIModel, AIResponse, GenerationRequest, selectModelForTask } from './models';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';
import { withTimeout, safeExecute } from '@/lib/utils/concurrency';

const AI_TIMEOUT = 30000; // 30 seconds
const FALLBACK_TIMEOUT = 5000; // 5 seconds for fallback

export class AIService {
  private static openaiProvider: OpenAIProvider;
  private static anthropicProvider: AnthropicProvider;
  private static googleProvider: GoogleProvider;

  private static getOpenAIProvider(): OpenAIProvider {
    if (!this.openaiProvider) {
      this.openaiProvider = new OpenAIProvider();
    }
    return this.openaiProvider;
  }

  private static getAnthropicProvider(): AnthropicProvider {
    if (!this.anthropicProvider) {
      this.anthropicProvider = new AnthropicProvider();
    }
    return this.anthropicProvider;
  }

  private static getGoogleProvider(): GoogleProvider {
    if (!this.googleProvider) {
      this.googleProvider = new GoogleProvider();
    }
    return this.googleProvider;
  }

  static async generateResponse(request: GenerationRequest): Promise<AIResponse> {
    const model = request.model || selectModelForTask('text-generation');
    
    try {
      Logger.info('AI generation request', {
        model: model.id,
        provider: model.provider,
        promptLength: request.prompt.length,
      });

      // Try primary provider with timeout
      const response = await withTimeout(
        this.executeProvider(request, model),
        AI_TIMEOUT
      );

      Logger.info('AI generation completed', {
        model: model.id,
        provider: model.provider,
        responseLength: response.content.length,
        usage: response.usage,
      });

      return response;
    } catch (error) {
      Logger.error('AI generation failed, attempting fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        provider: model.provider,
      });

      // Fast fallback to OpenAI
      return await this.fallbackToOpenAI(request, error);
    }
  }

  private static async executeProvider(request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    switch (model.provider) {
      case 'openai':
        return await this.getOpenAIProvider().generateResponse(request, model);
      case 'anthropic':
        return await this.getAnthropicProvider().generateResponse(request, model);
      case 'google':
        return await this.getGoogleProvider().generateResponse(request, model);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  private static async fallbackToOpenAI(request: GenerationRequest, originalError: any): Promise<AIResponse> {
    try {
      const fallbackModel = selectModelForTask('text-generation', 'openai');
      
      const response = await withTimeout(
        this.getOpenAIProvider().generateResponse(request, fallbackModel),
        FALLBACK_TIMEOUT
      );

      Logger.info('AI fallback successful', {
        originalProvider: request.model?.provider,
        fallbackProvider: 'openai',
        originalError: originalError instanceof Error ? originalError.message : 'Unknown error',
      });

      return response;
    } catch (fallbackError) {
      Logger.error('AI fallback also failed', {
        fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
      });

      // Return a safe fallback response
      return {
        content: 'I apologize, but I\'m currently experiencing technical difficulties. Please try again in a moment.',
        model: 'gpt-3.5-turbo',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        metadata: {
          finishReason: 'error',
          temperature: request.temperature,
          duration: 0,
          cost: 0,
        },
      };
    }
  }

  static async generateStream(request: GenerationRequest): Promise<ReadableStream<string>> {
    const model = request.model || selectModelForTask('text-generation');
    
    try {
      Logger.info('AI stream request', {
        model: model.id,
        provider: model.provider,
        promptLength: request.prompt.length,
      });

      switch (model.provider) {
        case 'openai':
          return await this.getOpenAIProvider().generateStream(request, model);
        case 'anthropic':
          return await this.getAnthropicProvider().generateStream(request, model);
        case 'google':
          return await this.getGoogleProvider().generateStream(request, model);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      Logger.error('AI stream failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        provider: model.provider,
      });

      // Try fallback provider
      if (model.provider !== 'openai') {
        Logger.info('Attempting fallback to OpenAI stream');
        try {
          const fallbackModel = selectModelForTask('text-generation', 'openai');
          return await this.getOpenAIProvider().generateStream(request, fallbackModel);
        } catch (fallbackError) {
          Logger.error('Fallback stream also failed', {
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          });
        }
      }

      throw error;
    }
  }

  static async generateCode(request: GenerationRequest): Promise<AIResponse> {
    const model = request.model || selectModelForTask('code-generation');
    
    try {
      Logger.info('AI code generation request', {
        model: model.id,
        provider: model.provider,
        language: request.language,
        framework: request.framework,
      });

      switch (model.provider) {
        case 'openai':
          return await this.getOpenAIProvider().generateCode(request, model);
        case 'anthropic':
          return await this.getAnthropicProvider().generateCode(request, model);
        case 'google':
          return await this.getGoogleProvider().generateCode(request, model);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      Logger.error('AI code generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        provider: model.provider,
      });
      throw error;
    }
  }

  static async refactorCode(code: string, request: GenerationRequest): Promise<AIResponse> {
    const model = request.model || selectModelForTask('code-generation');
    
    try {
      Logger.info('AI code refactoring request', {
        model: model.id,
        provider: model.provider,
        codeLength: code.length,
      });

      switch (model.provider) {
        case 'openai':
          return await this.getOpenAIProvider().refactorCode(code, request, model);
        case 'anthropic':
          return await this.getAnthropicProvider().refactorCode(code, request, model);
        case 'google':
          return await this.getGoogleProvider().refactorCode(code, request, model);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      Logger.error('AI code refactoring failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        provider: model.provider,
      });
      throw error;
    }
  }

  static async explainCode(code: string, request: GenerationRequest): Promise<AIResponse> {
    const model = request.model || selectModelForTask('analysis');
    
    try {
      Logger.info('AI code explanation request', {
        model: model.id,
        provider: model.provider,
        codeLength: code.length,
      });

      switch (model.provider) {
        case 'openai':
          return await this.getOpenAIProvider().explainCode(code, request, model);
        case 'anthropic':
          return await this.getAnthropicProvider().explainCode(code, request, model);
        case 'google':
          return await this.getGoogleProvider().explainCode(code, request, model);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      Logger.error('AI code explanation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        provider: model.provider,
      });
      throw error;
    }
  }

  static async generateTests(code: string, request: GenerationRequest): Promise<AIResponse> {
    const model = request.model || selectModelForTask('code-generation');
    
    try {
      Logger.info('AI test generation request', {
        model: model.id,
        provider: model.provider,
        codeLength: code.length,
        testFramework: request.testFramework,
      });

      switch (model.provider) {
        case 'openai':
          return await this.getOpenAIProvider().generateTests(code, request, model);
        case 'anthropic':
          return await this.getAnthropicProvider().generateTests(code, request, model);
        case 'google':
          return await this.getGoogleProvider().generateTests(code, request, model);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      Logger.error('AI test generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        provider: model.provider,
      });
      throw error;
    }
  }

  static async getAvailableModels(): Promise<AIModel[]> {
    try {
      const models: AIModel[] = [];
      
      // Get models from all providers
      try {
        const openaiModels = await this.getOpenAIProvider().getModels();
        models.push(...openaiModels);
      } catch (error) {
        Logger.warn('Failed to fetch OpenAI models', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      try {
        const anthropicModels = await this.getAnthropicProvider().getModels();
        models.push(...anthropicModels);
      } catch (error) {
        Logger.warn('Failed to fetch Anthropic models', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      try {
        const googleModels = await this.getGoogleProvider().getModels();
        models.push(...googleModels);
      } catch (error) {
        Logger.warn('Failed to fetch Google models', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return models;
    } catch (error) {
      Logger.error('Failed to fetch AI models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  static async healthCheck(): Promise<{
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    overall: boolean;
  }> {
    const health = {
      openai: false,
      anthropic: false,
      google: false,
      overall: false,
    };

    try {
      health.openai = await this.getOpenAIProvider().healthCheck();
    } catch (error) {
      Logger.warn('OpenAI health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      health.anthropic = await this.getAnthropicProvider().healthCheck();
    } catch (error) {
      Logger.warn('Anthropic health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    try {
      health.google = await this.getGoogleProvider().healthCheck();
    } catch (error) {
      Logger.warn('Google health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    health.overall = health.openai || health.anthropic || health.google;

    return health;
  }

  static async getModelInfo(modelId: string): Promise<AIModel | null> {
    const models = await this.getAvailableModels();
    return models.find(model => model.id === modelId) || null;
  }

  static async compareModels(modelIds: string[]): Promise<{
    models: AIModel[];
    comparison: {
      cost: number;
      speed: number;
      quality: number;
    }[];
  }> {
    const models = await this.getAvailableModels();
    const selectedModels = models.filter(model => modelIds.includes(model.id));

    const comparison = selectedModels.map(model => ({
      cost: model.pricing ? (model.pricing.input + model.pricing.output) / 2 : 0,
      speed: model.provider === 'google' ? 0.8 : model.provider === 'anthropic' ? 0.9 : 1.0, // Relative speed
      quality: model.capabilities.includes('advanced-reasoning') ? 0.9 : 0.8,
    }));

    return {
      models: selectedModels,
      comparison,
    };
  }
}

// Export singleton instance
export const aiService = AIService;
