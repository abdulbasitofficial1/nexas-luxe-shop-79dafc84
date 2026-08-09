import { useCallback, useState } from "react";
import type { Product } from "@/lib/types";
import type { AIMessage, AIResponse } from "@/lib/ai/types";
import { getRecommendedProducts, runNexasAssistant } from "@/lib/ai/assistant";

export function useNexasAI(products: Product[]) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  const sendMessage = useCallback(
    async (message: string, currentProductId?: string) => {
      const trimmed = message.trim();

      if (!trimmed || loading) return null;

      const userMessage: AIMessage = {
        role: "user",
        content: trimmed,
      };

      setMessages((previous) => [...previous, userMessage]);
      setLoading(true);

      try {
        /*
         * Run the Nexas AI engine with the real products
         * already loaded by the application.
         */
        const response = runNexasAssistant({
          message: trimmed,
          products,
          conversation: messages,
          currentProductId,
        });

        const assistantMessage: AIMessage = {
          role: "assistant",
          content: response.text,
        };

        setMessages((previous) => [
          ...previous,
          assistantMessage,
        ]);

        setLastResponse(response);

        return {
          response,
          products: getRecommendedProducts(
            response,
            products
          ),
        };
      } catch (error) {
        console.error("Nexas AI error:", error);

        const fallback: AIResponse = {
          text:
            "Sorry, mujhe abhi problem aa rahi hai. Aap Chat with Seller se hamari team se directly baat kar sakte hain. 😊",
          intent: "seller_chat",
          productIds: [],
          sellerChatRequired: true,
        };

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: fallback.text,
          },
        ]);

        setLastResponse(fallback);

        return {
          response: fallback,
          products: [],
        };
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, products]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setLastResponse(null);
  }, []);

  return {
    messages,
    loading,
    lastResponse,
    sendMessage,
    clearConversation,
  };
}
