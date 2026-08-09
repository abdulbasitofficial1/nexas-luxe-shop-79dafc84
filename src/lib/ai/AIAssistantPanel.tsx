import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";
import { useNexasAI } from "@/hooks/useNexasAI"; 

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onChatWithSeller?: () => void;
  currentProductId?: string;
}

export function AIAssistantPanel({
  open,
  onOpenChange,
  products,
  onChatWithSeller,
  currentProductId,
}: AIAssistantPanelProps) {
  const {
    messages,
    loading,
    lastResponse,
    sendMessage,
    clearConversation,
  } = useNexasAI(products);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length, loading]);

  if (!open) return null;

  const handleSend = async () => {
    const message = text.trim();

    if (!message || loading) return;

    setText("");
    await sendMessage(message, currentProductId);
  };

  return (
    <div
      className="
        fixed bottom-20 right-4 z-50
        flex h-[min(650px,75vh)] w-[calc(100vw-2rem)]
        max-w-md flex-col overflow-hidden
        rounded-2xl border border-yellow-500/30
        bg-background shadow-2xl
        sm:bottom-24 sm:right-6
      "
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-yellow-500/20 bg-black px-4 py-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-400">
          <Bot className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-yellow-400">
            Nexas AI
          </h2>

          <p className="text-xs text-white/60">
            Your Nexas Store shopping assistant
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="text-white hover:bg-white/10 hover:text-yellow-400"
          aria-label="Close Nexas AI"
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-400">
              <Bot className="size-8" />
            </div>

            <h3 className="font-semibold">
              Hi! I'm Nexas AI 👋
            </h3>

            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Ask me about products, prices, categories,
              delivery, COD, or anything about Nexas Store.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                "Kya haal hai?",
                "500 ke andar gift dikhao",
                "COD available hai?",
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => {
                    setText(question);
                  }}
                  className="
                    rounded-full border border-yellow-500/20
                    px-3 py-1.5 text-xs
                    transition hover:border-yellow-500/50
                    hover:bg-yellow-500/10
                  "
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isUser
                        ? "rounded-br-sm bg-black text-yellow-300"
                        : "rounded-bl-sm bg-secondary text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-3">
                  <div className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-yellow-500" />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-yellow-500"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-yellow-500"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recommended products */}
            {!loading &&
              lastResponse &&
              lastResponse.productIds.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Recommended for you
                  </p>

                  <div className="space-y-2">
                    {products
                      .filter((product) =>
                        lastResponse.productIds.includes(
                          product.id
                        )
                      )
                      .slice(0, 6)
                      .map((product) => (
                        <div
                          key={product.id}
                          className="
                            flex gap-3 rounded-xl border
                            border-border/60 p-2
                            transition hover:border-yellow-500/40
                          "
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="size-16 shrink-0 rounded-lg object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {product.name}
                            </p>

                            <p className="mt-1 font-semibold text-yellow-600 dark:text-yellow-400">
                              Rs {product.price.toLocaleString()}
                            </p>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7 text-xs"
                              onClick={() => {
                                window.location.href = `/products/${product.id}`;
                              }}
                            >
                              View Product
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Seller chat fallback */}
            {!loading &&
              lastResponse?.sellerChatRequired && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Need more help? Talk directly with our seller.
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    variant="gold"
                    onClick={onChatWithSeller}
                    disabled={!onChatWithSeller}
                    className="gap-2"
                  >
                    <MessageCircle className="size-4" />
                    Chat with Seller
                  </Button>
                </div>
              )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Clear */}
      {messages.length > 0 && (
        <div className="border-t border-border/50 px-3 py-2">
          <button
            type="button"
            onClick={clearConversation}
            className="text-xs text-muted-foreground transition hover:text-yellow-500"
          >
            Clear conversation
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask Nexas AI..."
            disabled={loading}
          />

          <Button
            type="button"
            size="icon"
            variant="gold"
            onClick={() => void handleSend()}
            disabled={!text.trim() || loading}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Nexas AI answers using your store catalog.
        </p>
      </div>
    </div>
  );
}
