import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiClientService {
  private readonly baseUrl: string;
  private readonly internalKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('aiService.url') || 'http://localhost:8000';
    this.internalKey = this.config.get<string>('aiService.internalKey') || '';
  }

  async detect(payload: {
    scan_id: string;
    image_urls: string[];
    provider: string;
    api_key?: string;
    model?: string;
  }) {
    return this.post('/detect', payload);
  }

  async estimate(payload: {
    scan_id: string;
    detected_parts: any[];
    vehicle?: { make: string; model: string; year: number };
    provider: string;
    api_key?: string;
    model?: string;
    city?: string;
  }) {
    return this.post('/estimate', payload);
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  private async post(path: string, body: object) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': this.internalKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'AI service error' }));
      throw new HttpException(
        (error as any).detail || 'AI service request failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }
}
