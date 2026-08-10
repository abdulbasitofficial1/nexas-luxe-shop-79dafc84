import type {
  AIProviderRequest,
  AIProviderResponse,
} from "./types";

export interface AIProvider {
  generateResponse(
    request: AIProviderRequest
  ): Promise<AIProviderResponse>;
}

/**
 * Provider-neutral AI layer for Nexas AI.
 *
 * The actual free AI provider will be connected later.
 * Keeping this layer separate means we can change the
 * AI provider without rewriting the Nexas Store AI system.
 */
export async function generateAIResponse(
  _request: AIProviderRequest
): Promise<AIProviderResponse> {
  throw new Error("AI provider is not configured yet.");
}
