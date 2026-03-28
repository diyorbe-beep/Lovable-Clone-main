import OpenAI from 'openai';
import { AIModel, AIResponse, GenerationRequest } from '../models';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';

export class OpenAIProvider {
  private client: OpenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
      organization: process.env.OPENAI_ORGANIZATION_ID,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });
  }

  async generateResponse(request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      Logger.info('OpenAI generation request', {
        model: model.id,
        promptLength: request.prompt.length,
        temperature: request.temperature,
      });

      const completion = await this.client.chat.completions.create({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || 'You are a helpful AI assistant.',
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
        top_p: request.topP ?? 1,
        frequency_penalty: request.frequencyPenalty ?? 0,
        presence_penalty: request.presencePenalty ?? 0,
        stream: false,
      });

      const response = completion.choices[0];
      const duration = Date.now() - startTime;
      const tokens = response.message.content ? this.estimateTokens(response.message.content) : 0;

      // Record metrics
      MetricsCollector.recordAIGeneration('openai', model.id, duration, tokens);
      MetricsCollector.recordPerformance('openai_generation', duration);

      Logger.info('OpenAI generation completed', {
        model: model.id,
        duration,
        tokens,
        responseLength: response.message.content?.length || 0,
      });

      return {
        content: response.message.content || '',
        model: model.id,
        provider: 'openai',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        metadata: {
          finishReason: response.finish_reason,
          temperature: request.temperature,
          duration,
          cost: this.calculateCost(model, completion.usage?.total_tokens || 0),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      MetricsCollector.recordError('openai_generation_failed');
      
      Logger.error('OpenAI generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        duration,
      });

      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStream(request: GenerationRequest, model: AIModel): Promise<ReadableStream<string>> {
    try {
      Logger.info('OpenAI stream request', {
        model: model.id,
        promptLength: request.prompt.length,
      });

      const stream = await this.client.chat.completions.create({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || 'You are a helpful AI assistant.',
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
        stream: true,
      });

      return new ReadableStream({
        start(controller) {
          (async () => {
            try {
              for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(content);
                }
              }
              controller.close();
            } catch (error) {
              Logger.error('OpenAI stream error', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              controller.error(error);
            }
          })();
        },
      });
    } catch (error) {
      Logger.error('OpenAI stream setup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`OpenAI stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCode(request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const codeRequest = {
      ...request,
      systemPrompt: `You are an expert software engineer. Generate clean, well-documented code that follows best practices. 
      Language: ${request.language || 'JavaScript'}
      Framework: ${request.framework || 'None'}
      
      Requirements:
      - Write production-ready code
      - Include error handling
      - Add comments where necessary
      - Follow the language's conventions
      - Be concise but complete
      
      ${request.systemPrompt || ''}`,
    };

    return this.generateResponse(codeRequest, model);
  }

  async refactorCode(code: string, request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const refactorRequest = {
      ...request,
      systemPrompt: `You are an expert code refactoring specialist. Improve the given code while maintaining its functionality.
      
      Focus on:
      - Code readability and maintainability
      - Performance optimization
      - Best practices and patterns
      - Error handling
      - Code organization
      
      Original code:
      ${code}
      
      ${request.systemPrompt || ''}`,
    };

    return this.generateResponse(refactorRequest, model);
  }

  async explainCode(code: string, request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const explainRequest = {
      ...request,
      systemPrompt: `You are an expert code educator. Explain the given code clearly and comprehensively.
      
      Explain:
      - What the code does
      - How it works
      - Key concepts and patterns
      - Potential improvements
      - Common pitfalls
      
      Code to explain:
      ${code}
      
      ${request.systemPrompt || ''}`,
    };

    return this.generateResponse(explainRequest, model);
  }

  async generateTests(code: string, request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const testRequest = {
      ...request,
      systemPrompt: `You are an expert test engineer. Generate comprehensive tests for the given code.
      
      Generate:
      - Unit tests
      - Integration tests (if applicable)
      - Edge case tests
      - Error handling tests
      - Performance tests (if relevant)
      
      Testing framework: ${request.testFramework || 'Jest'}
      Language: ${request.language || 'JavaScript'}
      
      Code to test:
      ${code}
      
      ${request.systemPrompt || ''}`,
    };

    return this.generateResponse(testRequest, model);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: AIModel, tokens: number): number {
    const pricing = model.pricing;
    if (!pricing) return 0;

    // Calculate cost based on token usage
    const inputCost = (tokens * pricing.input) / 1000;
    const outputCost = (tokens * pricing.output) / 1000;
    
    return inputCost + outputCost;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      Logger.error('OpenAI health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          name: model.id.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          provider: 'openai',
          contextWindow: this.getContextWindow(model.id),
          pricing: this.getPricing(model.id),
          capabilities: this.getCapabilities(model.id),
        }));
    } catch (error) {
      Logger.error('Failed to fetch OpenAI models', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  private getContextWindow(modelId: string): number {
    const windows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385,
    };
    
    return windows[modelId] || 4096;
  }

  private getPricing(modelId: string): { input: number; output: number } {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-32k': { input: 0.06, output: 0.12 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
    };
    
    return pricing[modelId] || { input: 0.001, output: 0.002 };
  }

  private getCapabilities(modelId: string): string[] {
    const baseCapabilities = ['text-generation', 'code-generation', 'analysis'];
    
    if (modelId.includes('gpt-4')) {
      return [...baseCapabilities, 'advanced-reasoning', 'multimodal', 'function-calling'];
    }
    
    if (modelId.includes('gpt-3.5')) {
      return baseCapabilities;
    }
    
    return baseCapabilities;
  }
}
