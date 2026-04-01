// Rate Limiter using Token Bucket Algorithm
// Manages API request throttling to prevent rate limit violations

export interface RateLimiterConfig {
  tokensPerHour?: number;
  initialTokens?: number;
}

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private lastRefillTime: number;
  private readonly minTokensPerRequest: number = 1;

  constructor(config: RateLimiterConfig = {}) {
    this.maxTokens = config.tokensPerHour || 5000;
    this.tokens = config.initialTokens ?? this.maxTokens;
    this.refillRate = this.maxTokens / (60 * 60 * 1000); // tokens per millisecond
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Attempt to consume tokens. Returns true if allowed, false if rate limited.
   * Does not block - caller must handle backoff.
   */
  allowRequest(tokensNeeded: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  /**
   * Get current token count (for monitoring)
   */
  getTokensAvailable(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get the time until the next request is likely allowed
   */
  getWaitTimeMs(): number {
    this.refill();

    if (this.tokens >= this.minTokensPerRequest) {
      return 0;
    }

    const tokensNeeded = this.minTokensPerRequest - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
}
