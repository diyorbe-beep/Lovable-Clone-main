'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Copy, Check, RefreshCw, Zap, Code, FileText, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/lib/ai/ai-service-new';
import { AIModel, AIResponse } from '@/lib/ai/models';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: {
    cost: number;
    duration: number;
  };
}

interface AIChatProps {
  initialMessages?: Message[];
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: AIResponse) => void;
}

export default function AIChat({ initialMessages = [], onMessageSent, onResponseReceived }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  const loadAvailableModels = async () => {
    try {
      const models = await aiService.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    onMessageSent?.(input.trim());

    try {
      const response = await aiService.generateResponse({
        prompt: input.trim(),
        model: availableModels.find(m => m.id === selectedModel),
        temperature: 0.7,
        maxTokens: 2000,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        model: response.model,
        usage: response.usage,
        metadata: response.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);
      onResponseReceived?.(response);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamContent('');
    onMessageSent?.(input.trim());

    try {
      const stream = await aiService.generateStream({
        prompt: input.trim(),
        model: availableModels.find(m => m.id === selectedModel),
        temperature: 0.7,
        maxTokens: 2000,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedContent += chunk;
        setStreamContent(accumulatedContent);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: accumulatedContent,
        timestamp: new Date(),
        model: selectedModel,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamContent('');
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleRegenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // Remove the current assistant message
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Regenerate response
    setInput(userMessage.content);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTokens = (tokens: number) => {
    return tokens.toLocaleString();
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getModelIcon = (modelId: string) => {
    if (modelId.includes('gpt')) return <Zap className="h-4 w-4" />;
    if (modelId.includes('claude')) return <FileText className="h-4 w-4" />;
    if (modelId.includes('gemini')) return <BarChart className="h-4 w-4" />;
    return <Code className="h-4 w-4" />;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">AI Assistant</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center space-x-2">
                      {getModelIcon(model.id)}
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={isStreaming ? "default" : "outline"}
              size="sm"
              onClick={isStreaming ? undefined : handleStreamMessage}
              disabled={isLoading}
            >
              {isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Streaming...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Stream
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex-1">
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {message.usage && (
                      <div className="mt-2 flex items-center space-x-4 text-xs opacity-70">
                        <span>Tokens: {formatTokens(message.usage.totalTokens)}</span>
                        {message.metadata?.cost && (
                          <span>Cost: {formatCost(message.metadata.cost)}</span>
                        )}
                        {message.metadata?.duration && (
                          <span>Duration: {message.metadata.duration}ms</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage(message.content, message.id)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerateResponse(message.id)}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {message.model && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {getModelIcon(message.model)}
                      <span className="ml-1">{message.model}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Streaming message */}
          {isStreaming && streamContent && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="whitespace-pre-wrap">{streamContent}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg p-4 bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI anything..."
              className="flex-1 min-h-[60px] max-h-32 resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
