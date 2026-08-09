import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  AIMessage,
  AIResponse,
} from "./ai/types";

const AIMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const AIRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversation: z.array(AIMessageSchema).max(10).optional(),
  currentProductId: z.string().optional(),
});

export const askNexasAI = createServerFn({ method: "POST" })
  .inputValidator(AIRequestSchema)
  .handler(async ({ data }): Promise<AIResponse> => {
    /*
     * Step 2 foundation only.
     *
     * The actual free AI provider will be connected in the
     * next step. Keeping the provider separate prevents the
     * client from ever receiving an API key.
     */

    void data;

    return {
      text: "Nexas AI is being prepared. Please try again shortly. 😊",
      intent: "store_question",
      productIds: [],
      sellerChatRequired: false,
    };
  });
