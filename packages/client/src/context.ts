// Mijoz ichki konteksti — apiUrl, kalit va joriy sessiya tokeni.
export class ClientContext {
  accessToken: string | null = null;

  constructor(
    public readonly apiUrl: string, // masalan http://host:8000/v1/<ref>
    public readonly apiKey: string, // anon yoki service key
  ) {}

  /** Joriy samarali kalit (sessiya bo'lsa user token, aks holda apiKey). */
  effectiveKey(): string {
    return this.accessToken ?? this.apiKey;
  }

  headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.effectiveKey(),
      authorization: `Bearer ${this.effectiveKey()}`,
      ...extra,
    };
  }

  /** WebSocket bazaviy URL (http -> ws). */
  wsUrl(): string {
    return this.apiUrl.replace(/^http/, "ws");
  }
}

export interface Result<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}
