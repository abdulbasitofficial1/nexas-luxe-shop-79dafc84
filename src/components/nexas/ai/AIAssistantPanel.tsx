import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  MessageCircle,
  Send,
  ShoppingCart,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";
import { useNexasAI } from "@/hooks/useNexasAI";
import { useCart } from "@/lib/cart-context";
import { getRecommendedProducts } from "@/lib/ai/assistant";
import {
  formatProductPrice,
  getProductImageUrls,
} from "@/lib/product-display";
import { AIProductImage } from "./AIProductImage";

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onChatWithSeller?: (productId?: string) => void;
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

  const { addItem } = useCart();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const recommendedProducts = useMemo(() => {
    if (!lastResponse?.productIds.length) return [];
    return getRecommendedProducts(lastResponse, products);
  }, [lastResponse, products]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, loading, lastResponse]);

  if (!open) return null;

  const submit = async () => {
    const message = text.trim();
    if (!message || loading) return;

    setText("");

    const result = await sendMessage(message, currentProductId);

    if (result?.response.sellerChatRequired) {
      openSellerChat();
    }
  };

  const openSellerChat = () => {
    if (!onChatWithSeller) {
      toast.error("Seller chat is unavailable right now.");
      return;
    }

    const productId =
      currentProductId ??
      lastResponse?.productIds[0] ??
      recommendedProducts[0]?.id;

    onChatWithSeller(productId);
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div
      className="
        fixed inset-x-3 bottom-20 z-50
        flex h-[min(680px,calc(100vh-7rem))] flex-col
        overflow-hidden rounded-3xl border border-border/60
        bg-background/95 shadow-2xl backdrop-blur-xl
        sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[410px]
      "
      role="dialog"
      aria-label="Nexas AI Assistant"
    >
      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold">
                Nexas AI
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                Assistant
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Your Nexas Store shopping assistant
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close Nexas AI"
          >
            <X className="size-4" />
          </Button>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Hi! I'm Nexas AI Assistant — mujhe Abdul Basit ne develop kiya hai. 😊
        </p>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-primary/10">
              <Bot className="size-8 text-primary" />
            </div>

            <h3 className="font-display text-lg font-semibold">
              How can I help?
            </h3>

            <p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">
              Products dhoondhne, prices check karne, ya Nexas Store ke baare
              mein poochne ke liye message karein.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                "Mujhe products dikhao",
                "3000 ke andar kya hai?",
                "COD available hai?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => setText(suggestion)}
                  className="rounded-full border border-border/70 bg-background px-3 py-2 text-xs transition hover:bg-secondary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-end gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                      isUser
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-secondary text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>

                  {isUser && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <UserRound className="size-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Product recommendations */}
            {!loading &&
              lastResponse &&
              lastResponse.productIds.length > 0 && (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✨</span>
                    <p className="text-xs font-semibold text-primary">
                      Recommended Products
                    </p>
                  </div>

                  {recommendedProducts.length > 0 ? (
                    <div className="space-y-3">
                      {recommendedProducts.map((product) => {
                        const productImages =
                          getProductImageUrls(product);

                        return (
                          <div
                            key={product.id}
                            className="
                              overflow-hidden rounded-xl
                              border border-border/60 bg-card
                              transition-all hover:border-primary/40
                            "
                          >
                            <div className="flex gap-3 p-2.5">
                              <Link
                                to="/products/$productId"
                                params={{ productId: product.id }}
                                className="
                                  relative size-24 shrink-0
                                  overflow-hidden rounded-lg bg-secondary
                                "
                              >
                                <AIProductImage product={product} />

                                {product.category && (
                                  <span
                                    className="
                                      absolute bottom-1 left-1
                                      rounded-full bg-black/80
                                      px-1.5 py-0.5 text-[8px]
                                      font-medium text-primary
                                    "
                                  >
                                    {product.category}
                                  </span>
                                )}
                              </Link>

                              <div className="min-w-0 flex-1">
                                <Link
                                  to="/products/$productId"
                                  params={{ productId: product.id }}
                                >
                                  <p className="line-clamp-2 text-sm font-semibold transition-colors hover:text-primary">
                                    {product.name}
                                  </p>
                                </Link>

                                {product.category && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {product.category}
                                  </p>
                                )}

                                <p className="mt-1 text-base font-bold text-primary">
                                  {formatProductPrice(product.price)}
                                </p>

                                <div className="mt-2 flex gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="gold"
                                    className="h-7 flex-1 px-2 text-[10px]"
                                    onClick={() =>
                                      handleAddToCart(product)
                                    }
                                  >
                                    <ShoppingCart className="mr-1 size-3" />
                                    Add
                                  </Button>

                                  <Button
                                    asChild
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 flex-1 px-2 text-[10px]"
                                  >
                                    <Link
                                      to="/products/$productId"
                                      params={{
                                        productId: product.id,
                                      }}
                                    >
                                      View
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {productImages.length > 1 && (
                              <div className="border-t border-border/40 px-2.5 py-1.5 text-[9px] text-muted-foreground">
                                📷 {productImages.length} product images
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
                      Products were found, but they are no longer available
                      in the current catalog.
                    </div>
                  )}
                </div>
              )}

            {/* Seller chat prompt */}
            {!loading && lastResponse?.sellerChatRequired && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Need more help? Talk directly with our seller.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="gold"
                  onClick={openSellerChat}
                  className="gap-2"
                >
                  <MessageCircle className="size-4" />
                  Chat with Seller
                </Button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Seller fallback */}
      <div className="border-t border-border/60 px-3 pt-2">
        <button
          type="button"
          onClick={openSellerChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <MessageCircle className="size-3.5" />
          Chat with Seller
        </button>
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Ask Nexas AI..."
            disabled={loading}
            className="h-11 rounded-xl"
          />

          <Button
            type="button"
            variant="gold"
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            disabled={loading || !text.trim()}
            onClick={() => void submit()}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            className="mt-2 w-full text-center text-[10px] text-muted-foreground hover:text-foreground"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}
