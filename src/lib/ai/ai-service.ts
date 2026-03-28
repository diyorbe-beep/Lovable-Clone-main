import OpenAI from 'openai';
import { AIRequest, AIResponse, AI_MODELS, selectModelForTask, estimateTokens, calculateCost, ModelPerformanceTracker } from './models';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';

// Initialize AI providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
  static async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = AI_MODELS.find(m => m.id === request.model) || selectModelForTask('text-generation');
    
    try {
      Logger.logAI(model.id, request.prompt, '', 0, {
        requestType: 'generation',
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      let response: AIResponse;

      switch (model.provider) {
        case 'openai':
          response = await this.handleOpenAIRequest(request, model);
          break;
        case 'anthropic':
          response = await this.handleAnthropicRequest(request, model);
          break;
        case 'google':
          response = await this.handleGoogleRequest(request, model);
          break;
        case 'grok':
          response = await this.handleGrokRequest(request, model);
          break;
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }

      const latency = Date.now() - startTime;
      const cost = calculateCost(model, estimateTokens(request.prompt), response.tokensUsed);

      // Record metrics
      ModelPerformanceTracker.recordRequest(model.id, latency, response.tokensUsed, true, cost);
      MetricsCollector.recordAIGeneration(model.id, response.tokensUsed, latency);
      Logger.logAI(model.id, request.prompt, response.content, response.tokensUsed, {
        latency,
        cost,
        success: true,
      });

      return {
        ...response,
        latency,
        metadata: {
          ...response.metadata,
          cost,
          provider: model.provider,
        },
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      Logger.error('AI request failed', {
        model: model.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency,
        prompt: request.prompt.substring(0, 100),
      });

      ModelPerformanceTracker.recordRequest(model.id, latency, 0, false, 0);
      MetricsCollector.recordError('ai_request_failed', `${model.provider}:${model.id}`);

      throw error;
    }
  }

  private static async handleOpenAIRequest(request: AIRequest, model: any): Promise<AIResponse> {
    const messages = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system' as const, content: request.systemPrompt });
    }
    
    messages.push({ role: 'user' as const, content: request.prompt });

    const completion = await openai.chat.completions.create({
      model: request.model,
      messages,
      max_tokens: request.maxTokens || model.maxTokens,
      temperature: request.temperature || 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model: request.model,
      latency: 0, // Will be set by caller
      metadata: {
        finishReason: completion.choices[0]?.finish_reason,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
      },
    };
  }

  private static async handleAnthropicRequest(request: AIRequest, model: any): Promise<AIResponse> {
    // Anthropic API integration
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens || model.maxTokens,
        temperature: request.temperature || 0.7,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';
    const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;

    return {
      content,
      tokensUsed,
      model: request.model,
      latency: 0,
      metadata: {
        finishReason: data.stop_reason,
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
      },
    };
  }

  private static async handleGoogleRequest(request: AIRequest, model: any): Promise<AIResponse> {
    // Google Gemini API integration
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: request.systemPrompt ? `${request.systemPrompt}\n\n${request.prompt}` : request.prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || model.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates[0]?.content?.parts[0]?.text || '';
    const tokensUsed = estimateTokens(content); // Google doesn't provide token count

    return {
      content,
      tokensUsed,
      model: request.model,
      latency: 0,
      metadata: {
        finishReason: data.candidates[0]?.finishReason,
        safetyRatings: data.candidates[0]?.safetyRatings,
      },
    };
  }

  private static async handleGrokRequest(request: AIRequest, model: any): Promise<AIResponse> {
    // Grok API integration (X AI)
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || model.maxTokens,
        temperature: request.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model: request.model,
      latency: 0,
      metadata: {
        finishReason: data.choices[0]?.finish_reason,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  }

  // Advanced features

  static async generateCode(request: AIRequest, language: string): Promise<AIResponse> {
    const systemPrompt = `You are an expert ${language} developer. Generate clean, production-ready code that follows best practices. Include comments where necessary. Ensure the code is secure and efficient.`;
    
    const enhancedRequest = {
      ...request,
      systemPrompt,
      model: selectModelForTask('code-generation').id,
    };

    return this.generateResponse(enhancedRequest);
  }

  static async analyzeCode(code: string, language: string): Promise<AIResponse> {
    const systemPrompt = `You are an expert code analyst. Analyze the following ${language} code for security vulnerabilities, performance issues, and best practices. Provide specific, actionable recommendations.`;
    
    const request: AIRequest = {
      prompt: `Analyze this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      model: selectModelForTask('analysis').id,
      systemPrompt,
    };

    return this.generateResponse(request);
  }

  static async refactorCode(code: string, language: string, instructions?: string): Promise<AIResponse> {
    const systemPrompt = `You are an expert ${language} developer. Refactor the following code to improve readability, performance, and maintainability while preserving functionality.`;
    
    const prompt = instructions 
      ? `Refactor this code according to these instructions: ${instructions}\n\n\`\`\`${language}\n${code}\n\`\`\``
      : `Refactor this code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

    const request: AIRequest = {
      prompt,
      model: selectModelForTask('code-generation').id,
      systemPrompt,
    };

    return this.generateResponse(request);
  }

  static async explainCode(code: string, language: string, detailLevel: 'basic' | 'detailed' = 'basic'): Promise<AIResponse> {
    const detailInstructions = detailLevel === 'detailed' 
      ? 'Provide a comprehensive explanation including architecture, design patterns, and potential edge cases.'
      : 'Provide a clear, concise explanation of what this code does.';

    const systemPrompt = `You are an expert ${language} developer. ${detailInstructions} Use simple language and provide examples where helpful.`;
    
    const request: AIRequest = {
      prompt: `Explain this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      model: selectModelForTask('analysis').id,
      systemPrompt,
    };

    return this.generateResponse(request);
  }

  static async generateTests(code: string, language: string, testFramework?: string): Promise<AIResponse> {
    const framework = testFramework || this.getDefaultTestFramework(language);
    const systemPrompt = `You are an expert in testing and ${language}. Generate comprehensive unit tests using ${framework}. Include edge cases, error handling, and proper assertions.`;
    
    const request: AIRequest = {
      prompt: `Generate tests for this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      model: selectModelForTask('code-generation').id,
      systemPrompt,
    };

    return this.generateResponse(request);
  }

  private static getDefaultTestFramework(language: string): string {
    const frameworks: Record<string, string> = {
      javascript: 'Jest',
      typescript: 'Jest',
      python: 'pytest',
      java: 'JUnit',
      'c#': 'xUnit',
      ruby: 'RSpec',
      go: 'Go testing',
    };
    return frameworks[language] || 'Jest';
  }

  // Batch processing for multiple requests
  static async generateBatch(requests: AIRequest[]): Promise<AIResponse[]> {
    const promises = requests.map(request => this.generateResponse(request));
    return Promise.all(promises);
  }

  // Streaming response for long generations
  static async *generateStream(request: AIRequest): AsyncGenerator<string, void, unknown> {
    const model = AI_MODELS.find(m => m.id === request.model) || selectModelForTask('text-generation');
    
    if (model.provider === 'openai') {
      const stream = await openai.chat.completions.create({
        model: request.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
          { role: 'user' as const, content: request.prompt },
        ],
        max_tokens: request.maxTokens || model.maxTokens,
        temperature: request.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } else {
      // For non-streaming providers, fall back to regular generation
      const response = await this.generateResponse(request);
      yield response.content;
    }
  }
}
