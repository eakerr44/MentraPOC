const axios = require('axios');
const { getAIConfig, getCurrentEnvironment } = require('../config/environment');

// Supported AI providers
const AI_PROVIDERS = {
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  MOCK: 'mock' // For development/testing
};

// Standard error types
class AIServiceError extends Error {
  constructor(message, provider, originalError = null) {
    super(message);
    this.name = 'AIServiceError';
    this.provider = provider;
    this.originalError = originalError;
  }
}

class AIRateLimitError extends AIServiceError {
  constructor(message, provider, retryAfter = null) {
    super(message, provider);
    this.name = 'AIRateLimitError';
    this.retryAfter = retryAfter;
  }
}

class AIContentFilterError extends AIServiceError {
  constructor(message, provider, reason = null) {
    super(message, provider);
    this.name = 'AIContentFilterError';
    this.reason = reason;
  }
}

// Base AI Provider class
class BaseAIProvider {
  constructor(config) {
    this.config = config;
    this.name = 'base';
  }

  // Abstract methods that must be implemented by subclasses
  async generateResponse(prompt, options = {}) {
    throw new Error('generateResponse must be implemented by subclass');
  }

  async checkHealth() {
    throw new Error('checkHealth must be implemented by subclass');
  }

  // Common utility methods
  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AIServiceError('Invalid prompt: must be a non-empty string', this.name);
    }
    
    if (prompt.length > (this.config.maxPromptLength || 10000)) {
      throw new AIServiceError('Prompt too long', this.name);
    }
    
    return true;
  }

  sanitizeResponse(response) {
    if (!response || typeof response !== 'string') {
      return '';
    }
    
    // Basic sanitization
    return response
      .trim()
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\u0001-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .substring(0, this.config.maxResponseLength || 5000);
  }

  formatError(error, context = '') {
    const errorMessage = error?.message || 'Unknown error';
    const errorContext = context ? ` (Context: ${context})` : '';
    return `${this.name} AI Error: ${errorMessage}${errorContext}`;
  }
}

// Ollama Provider (Local LLM)
class OllamaProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.name = AI_PROVIDERS.OLLAMA;
    this.baseURL = config.endpoint || 'http://localhost:11434';
    this.model = config.model || 'llama2';
    this.timeout = config.timeout || 30000;
  }

  async generateResponse(prompt, options = {}) {
    this.validatePrompt(prompt);
    
    const requestConfig = {
      method: 'POST',
      url: `${this.baseURL}/api/generate`,
      timeout: this.timeout,
      data: {
        model: options.model || this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          max_tokens: options.maxTokens || 1000,
          stop: options.stopSequences || []
        }
      }
    };

    try {
      const response = await axios(requestConfig);
      
      if (response.data?.response) {
        return {
          text: this.sanitizeResponse(response.data.response),
          provider: this.name,
          model: this.model,
          usage: {
            promptTokens: response.data.prompt_eval_count || 0,
            completionTokens: response.data.eval_count || 0,
            totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
          },
          finishReason: response.data.done ? 'stop' : 'length'
        };
      } else {
        throw new AIServiceError('Invalid response format from Ollama', this.name);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new AIServiceError('Ollama service unavailable', this.name, error);
      } else if (error.response?.status === 429) {
        throw new AIRateLimitError('Ollama rate limit exceeded', this.name);
      } else {
        throw new AIServiceError(this.formatError(error, 'generateResponse'), this.name, error);
      }
    }
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, { timeout: 5000 });
      return {
        healthy: true,
        provider: this.name,
        models: response.data?.models?.map(m => m.name) || [],
        version: response.data?.version || 'unknown'
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.name,
        error: error.message
      };
    }
  }
}

// OpenAI Provider
class OpenAIProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.name = AI_PROVIDERS.OPENAI;
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.baseURL = 'https://api.openai.com/v1';
    this.timeout = config.timeout || 30000;

    if (!this.apiKey) {
      throw new AIServiceError('OpenAI API key is required', this.name);
    }
  }

  async generateResponse(prompt, options = {}) {
    this.validatePrompt(prompt);

    const requestConfig = {
      method: 'POST',
      url: `${this.baseURL}/chat/completions`,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: options.model || this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        max_tokens: options.maxTokens || 1000,
        stop: options.stopSequences || null
      }
    };

    try {
      const response = await axios(requestConfig);
      const choice = response.data.choices?.[0];
      
      if (choice?.message?.content) {
        return {
          text: this.sanitizeResponse(choice.message.content),
          provider: this.name,
          model: response.data.model,
          usage: {
            promptTokens: response.data.usage?.prompt_tokens || 0,
            completionTokens: response.data.usage?.completion_tokens || 0,
            totalTokens: response.data.usage?.total_tokens || 0
          },
          finishReason: choice.finish_reason || 'unknown'
        };
      } else {
        throw new AIServiceError('Invalid response format from OpenAI', this.name);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        throw new AIRateLimitError('OpenAI rate limit exceeded', this.name, retryAfter);
      } else if (error.response?.status === 400 && error.response.data?.error?.type === 'invalid_request_error') {
        throw new AIContentFilterError('Content filtered by OpenAI', this.name, error.response.data.error.message);
      } else {
        throw new AIServiceError(this.formatError(error, 'generateResponse'), this.name, error);
      }
    }
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000
      });
      
      return {
        healthy: true,
        provider: this.name,
        models: response.data?.data?.map(m => m.id) || [],
        organization: response.headers['openai-organization'] || 'unknown'
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.name,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

// Mock Provider (for testing/development)
class MockProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.name = AI_PROVIDERS.MOCK;
    this.delay = config.delay || 1000;
  }

  async generateResponse(prompt, options = {}) {
    this.validatePrompt(prompt);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    // Generate mock educational response
    const mockResponses = [
      "That's a great question! Let me help you think through this step by step.",
      "I can see you're working hard on this problem. Here's one way to approach it...",
      "You're on the right track! Let's break this down into smaller parts.",
      "This is a common challenge many students face. Let's explore this together.",
      "I notice you might be getting stuck here. What if we tried a different approach?"
    ];
    
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    return {
      text: `${randomResponse}\n\n[Mock AI Response for: "${prompt.substring(0, 50)}..."]`,
      provider: this.name,
      model: 'mock-educational-model',
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: 50,
        totalTokens: Math.floor(prompt.length / 4) + 50
      },
      finishReason: 'stop'
    };
  }

  async checkHealth() {
    return {
      healthy: true,
      provider: this.name,
      models: ['mock-educational-model'],
      version: '1.0.0-mock'
    };
  }
}

// Main AI Service Class
class AIService {
  constructor() {
    this.config = getAIConfig();
    this.env = getCurrentEnvironment();
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackProvider = null;
    
    this.initializeProviders();
  }

  initializeProviders() {
    const providers = [];
    
    // Development environment - prefer mock for stability
    if (this.env === 'development') {
      providers.push(
        { type: AI_PROVIDERS.MOCK, config: { delay: 500 } },
        { type: AI_PROVIDERS.OLLAMA, config: this.config }
      );
    } else {
      // Production/staging - prefer real AI providers
      if (this.config.apiKey) {
        providers.push({ type: AI_PROVIDERS.OPENAI, config: this.config });
      }
      providers.push(
        { type: AI_PROVIDERS.OLLAMA, config: this.config },
        { type: AI_PROVIDERS.MOCK, config: { delay: 100 } }
      );
    }

    // Initialize providers
    for (const { type, config } of providers) {
      try {
        let provider;
        switch (type) {
          case AI_PROVIDERS.OLLAMA:
            provider = new OllamaProvider(config);
            break;
          case AI_PROVIDERS.OPENAI:
            provider = new OpenAIProvider(config);
            break;
          case AI_PROVIDERS.MOCK:
            provider = new MockProvider(config);
            break;
          default:
            console.warn(`Unknown AI provider type: ${type}`);
            continue;
        }
        
        this.providers.set(type, provider);
        
        // Set active provider (first successful one)
        if (!this.activeProvider) {
          this.activeProvider = provider;
        }
        
        // Set fallback provider (prefer mock for reliability)
        if (!this.fallbackProvider && type === AI_PROVIDERS.MOCK) {
          this.fallbackProvider = provider;
        }
        
        console.log(`✅ AI Provider initialized: ${type}`);
      } catch (error) {
        console.warn(`⚠️  Failed to initialize AI provider ${type}:`, error.message);
      }
    }

    if (!this.activeProvider) {
      throw new AIServiceError('No AI providers could be initialized', 'service');
    }

    console.log(`🤖 Active AI provider: ${this.activeProvider.name}`);
    if (this.fallbackProvider) {
      console.log(`🔄 Fallback AI provider: ${this.fallbackProvider.name}`);
    }
  }

  // Main method for generating AI responses
  async generateResponse(prompt, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    // Try active provider first
    try {
      const result = await this.activeProvider.generateResponse(prompt, options);
      result.responseTime = Date.now() - startTime;
      result.provider = this.activeProvider.name;
      
      console.log(`🎯 AI response generated by ${this.activeProvider.name} in ${result.responseTime}ms`);
      return result;
    } catch (error) {
      console.warn(`⚠️  Primary AI provider ${this.activeProvider.name} failed:`, error.message);
      lastError = error;
      
      // Don't fallback for content filter errors
      if (error instanceof AIContentFilterError) {
        throw error;
      }
    }

    // Try fallback provider if available
    if (this.fallbackProvider && this.fallbackProvider !== this.activeProvider) {
      try {
        console.log(`🔄 Attempting fallback to ${this.fallbackProvider.name}`);
        const result = await this.fallbackProvider.generateResponse(prompt, options);
        result.responseTime = Date.now() - startTime;
        result.provider = this.fallbackProvider.name;
        result.usedFallback = true;
        
        console.log(`🎯 AI response generated by fallback ${this.fallbackProvider.name} in ${result.responseTime}ms`);
        return result;
      } catch (fallbackError) {
        console.error(`❌ Fallback AI provider ${this.fallbackProvider.name} also failed:`, fallbackError.message);
      }
    }

    // All providers failed
    throw lastError || new AIServiceError('All AI providers failed', 'service');
  }

  // Health check for all providers
  async checkHealth() {
    const results = {};
    
    for (const [type, provider] of this.providers) {
      try {
        results[type] = await provider.checkHealth();
      } catch (error) {
        results[type] = {
          healthy: false,
          provider: type,
          error: error.message
        };
      }
    }
    
    return {
      activeProvider: this.activeProvider?.name,
      fallbackProvider: this.fallbackProvider?.name,
      providers: results,
      overall: Object.values(results).some(r => r.healthy)
    };
  }

  // Get available models from all providers
  async getAvailableModels() {
    const models = {};
    
    for (const [type, provider] of this.providers) {
      try {
        const health = await provider.checkHealth();
        if (health.healthy && health.models) {
          models[type] = health.models;
        }
      } catch (error) {
        console.warn(`Could not get models for ${type}:`, error.message);
      }
    }
    
    return models;
  }

  // Switch active provider
  switchProvider(providerType) {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new AIServiceError(`Provider ${providerType} not available`, 'service');
    }
    
    const oldProvider = this.activeProvider?.name;
    this.activeProvider = provider;
    console.log(`🔄 Switched AI provider from ${oldProvider} to ${providerType}`);
  }

  // Get current provider info
  getProviderInfo() {
    return {
      active: this.activeProvider?.name,
      fallback: this.fallbackProvider?.name,
      available: Array.from(this.providers.keys()),
      config: {
        timeout: this.config.timeout,
        model: this.config.model,
        endpoint: this.config.endpoint
      }
    };
  }
}

// Singleton instance
let aiServiceInstance = null;

const getAIService = () => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
};

module.exports = {
  AIService,
  getAIService,
  AI_PROVIDERS,
  AIServiceError,
  AIRateLimitError,
  AIContentFilterError,
  BaseAIProvider,
  OllamaProvider,
  OpenAIProvider,
  MockProvider
}; 