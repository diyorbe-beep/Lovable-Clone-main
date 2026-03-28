import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel, AIResponse, GenerationRequest } from '../models';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';

export class GoogleProvider {
  private client: GoogleGenerativeAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Generative AI API key is required');
    }

    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  async generateResponse(request: GenerationRequest, model: AIModel): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      Logger.info('Google AI generation request', {
        model: model.id,
        promptLength: request.prompt.length,
        temperature: request.temperature,
      });

      const genAI = this.client.getGenerativeModel({ model: model.id });
      
      const fullPrompt = `${request.systemPrompt || ''}\n\n${request.prompt}`;
      
      const result = await genAI.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();
      
      const duration = Date.now() - startTime;
      const tokens = this.estimateTokens(text);

      // Record metrics
      MetricsCollector.recordAIGeneration('google', model.id, duration, tokens);
      MetricsCollector.recordPerformance('google_generation', duration);

      Logger.info('Google AI generation completed', {
        model: model.id,
        duration,
        tokens,
        responseLength: text.length,
      });

      return {
        content: text,
        model: model.id,
        provider: 'google',
        usage: {
          promptTokens: this.estimateTokens(request.prompt),
          completionTokens: tokens,
          totalTokens: this.estimateTokens(request.prompt) + tokens,
        },
        metadata: {
          finishReason: response.candidates?.[0]?.finishReason || 'stop',
          temperature: request.temperature,
          duration,
          cost: this.calculateCost(model, this.estimateTokens(request.prompt) + tokens),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      MetricsCollector.recordError('google_generation_failed');
      
      Logger.error('Google AI generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: model.id,
        duration,
      });

      throw new Error(`Google AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStream(request: GenerationRequest, model: AIModel): Promise<ReadableStream<string>> {
    try {
      Logger.info('Google AI stream request', {
        model: model.id,
        promptLength: request.prompt.length,
      });

      const genAI = this.client.getGenerativeModel({ model: model.id });
      
      const fullPrompt = `${request.systemPrompt || ''}\n\n${request.prompt}`;
      
      const result = await genAI.generateContentStream(fullPrompt);

      return new ReadableStream({
        start(controller) {
          (async () => {
            try {
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  controller.enqueue(chunkText);
                }
              }
              controller.close();
            } catch (error) {
              Logger.error('Google AI stream error', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              controller.error(error);
            }
          })();
        },
      });
    } catch (error) {
      Logger.error('Google AI stream setup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Google AI stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // Google AI uses ~4 characters per token
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
      const genAI = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await genAI.generateContent('Hi');
      return true;
    } catch (error) {
      Logger.error('Google AI health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getModels(): Promise<AIModel[]> {
    const models: AIModel[] = [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        contextWindow: 1048576, // 1M tokens
        pricing: { input: 0.0035, output: 0.0105 },
        capabilities: ['text-generation', 'code-generation', 'analysis', 'multimodal', 'advanced-reasoning'],
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        contextWindow: 1048576, // 1M tokens
        pricing: { input: 0.00015, output: 0.0006 },
        capabilities: ['text-generation', 'code-generation', 'analysis', 'multimodal'],
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: 'google',
        contextWindow: 32768,
        pricing: { input: 0.0005, output: 0.0015 },
        capabilities: ['text-generation', 'code-generation', 'analysis'],
      },
    ];

    return models;
  }
}
