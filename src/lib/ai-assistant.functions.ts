import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AIResponse } from "./ai/types";

const AIMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const AIRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversation: z.array(AIMessageSchema).max(10).optional(),
  currentProductId: z.string().optional(),
});

export const askNexasAI = createServerFn({ method: "POST" })
  .inputValidator(AIRequestSchema)
  .handler(async ({ data }): Promise<AIResponse> => {
    /*
     * Nexas AI server entry point.
     *
     * IMPORTANT:
     * - No AI provider is called from the browser.
     * - No API key is exposed to the client.
     * - The actual free AI provider will be connected
     *   behind the provider abstraction.
     */

    // Temporary safe response until the free provider
    // is connected.
    void data;

    return {
      text:
        "Hi! I'm Nexas AI Assistant — mujhe Abdul Basit ne develop kiya hai. 😊",
      intent: "greeting",
      productIds: [],
      sellerChatRequired: false,
    };
  });
