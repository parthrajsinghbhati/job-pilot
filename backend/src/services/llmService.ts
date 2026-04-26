import Groq from 'groq-sdk';
import * as config from '../config';
import { z } from 'zod';

const groq = new Groq({ apiKey: config.LLM_API_KEY });

export class RateLimiter {
  maxRpm: number;
  tokens: number;
  lastRefill: number;

  constructor(maxRpm: number) {
    this.maxRpm = maxRpm;
    this.tokens = maxRpm;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      const elapsed = (now - this.lastRefill) / 1000.0;
      const refill = elapsed * (this.maxRpm / 60.0);
      
      this.tokens = Math.min(this.maxRpm, this.tokens + refill);
      this.lastRefill = now;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

class LLMClient {
  model: string;
  maxRetries: number;
  retryBaseDelay: number;
  requestDelay: number;
  rateLimiter: RateLimiter;

  constructor(
    model: string,
    maxRpm: number,
    maxRetries: number,
    retryBaseDelay: number,
    requestDelay: number
  ) {
    this.model = model;
    this.maxRetries = maxRetries;
    this.retryBaseDelay = retryBaseDelay;
    this.requestDelay = requestDelay;
    this.rateLimiter = new RateLimiter(maxRpm);
  }

  async generateContent<T>(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 1,
    schema?: z.ZodSchema<T>
  ): Promise<T | string> {
    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let lastException: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.rateLimiter.acquire();

        if (this.requestDelay > 0 && attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, this.requestDelay * 1000));
        }

        console.log(`LLM request attempt ${attempt + 1}/${this.maxRetries + 1} to ${this.model}`);

        const response = await groq.chat.completions.create({
          messages,
          model: this.model,
          temperature,
          response_format: schema ? { type: 'json_object' } : undefined,
        });

        const content = response.choices[0]?.message?.content || '';

        if (!content) {
          console.warn('LLM returned empty content');
          return '';
        }

        if (schema) {
          try {
            const parsed = JSON.parse(content);
            return schema.parse(parsed);
          } catch (e) {
            console.error('Failed to parse structured output:', content);
            throw new Error('Structured output parsing failed');
          }
        }

        return content.trim();

      } catch (e: any) {
        lastException = e;
        const errorStr = (e.message || '').toLowerCase();
        
        const isRateLimit = ['429', 'rate_limit', 'rate limit', 'resource_exhausted', 'quota', 'too many requests'].some(k => errorStr.includes(k));

        if (isRateLimit && attempt < this.maxRetries) {
          const delay = (this.retryBaseDelay * Math.pow(2, attempt) + Math.random() * 5) * 1000;
          console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error('LLM API error:', e);
        throw e;
      }
    }
    
    throw lastException;
  }
}

export const primaryClient = new LLMClient(
  config.LLM_MODEL,
  config.LLM_MAX_RPM,
  config.LLM_MAX_RETRIES,
  config.LLM_RETRY_BASE_DELAY,
  config.LLM_REQUEST_DELAY_SECONDS
);
