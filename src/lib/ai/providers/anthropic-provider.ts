import Anthropic from '@anthropic-ai/sdk';
import { AIModel, AIResponse, GenerationRequest } from '../models';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';

export class AnthropicProvider {
  private client: Anthropic;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });
  }

  async generateResponse(request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      Logger.info('Anthropic generation request', {
        model: model.id,
        promptLength: request.prompt.length,
        temperature: request.temperature,
      });

      const message = await this.client.messages.create({
        model: model.id,
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1,
        messages: [
          {
            role: 'user',
            content: `${request.systemPrompt || ''}\n\n${request.prompt}`,
          },
        ],
      });

      const response = message.content[0];
      const duration = Date.now() - startTime;
      const tokens = this.estimateTokens(response.type === 'text' ? response.text : '');

      // Record metrics
      MetricsCollector.recordAIGeneration('anthropic', model.id, duration, tokens);
      MetricsCollector.recordPerformance('anthropic_generation', duration);

      Logger.info('Anthropic generation completed', {
        model: model.id,
        duration,
        tokens,
        responseLength: response.type === 'text' ? response.text.length : 0,
      });

      return {
        content: response.type === 'text' ? response.text : '',
        model: model.id,
        provider: 'anthropic',
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        },
        metadata: {
          finishReason: message.stop_reason,
          temperature: request.temperature,
          duration,
          cost: this.calculateCost(model, message.usage.input_tokens + message.usage.output_tokens),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      MetricsCollector.recordError('anthropic_generation_failed');
      
      Logger.error('Anthropic generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        duration,
      });

      throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStream(request: GenerationRequest, model: AIModel): Promise<ReadableStream<string>> {
    try {
      Logger.info('Anthropic stream request', {
        model: model.id,
        promptLength: request.prompt.length,
      });

      const stream = await this.client.messages.create({
        model: model.id,
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.7,
        messages: [
          {
            role: 'user',
            content: `${request.systemPrompt || ''}\n\n${request.prompt}`,
          },
        ],
        stream: true,
      });

      return new ReadableStream({
        start(controller) {
          (async () => {
            try {
              for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  controller.enqueue(chunk.delta.text);
                }
              }
              controller.close();
            } catch (error) {
              Logger.error('Anthropic stream error', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              controller.error(error);
            }
          })();
        },
      });
    } catch (error) {
      Logger.error('Anthropic stream setup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Anthropic stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // Anthropic uses ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: AIModel, tokens: number): number {
    const pricing = model.pricing;
    if (!pricing) return 0;

    const inputCost = (tokens * pricing.input) / 1000;
    const outputCost = (tokens * pricing.output) / 1000;
    
    return inputCost + outputCost;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (error) {
      Logger.error('Anthropic health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getModels(): Promise<AIModel[]> {
    const models: AIModel[] = [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextWindow: 200000,
        pricing: { input: 0.015, output: 0.075 },
        capabilities: ['text-generation', 'code-generation', 'analysis', 'advanced-reasoning'],
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        pricing: { input: 0.003, output: 0.015 },
        capabilities: ['text-generation', 'code-generation', 'analysis'],
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        pricing: { input: 0.00025, output: 0.00125 },
        capabilities: ['text-generation', 'code-generation', 'analysis'],
      },
    ];

    return models;
  }
}
