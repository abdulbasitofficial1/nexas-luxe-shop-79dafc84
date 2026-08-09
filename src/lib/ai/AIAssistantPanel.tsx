import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  MessageCircle,
  Send,
  ShoppingCart,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";
import { useNexasAI } from "@/hooks/useNexasAI";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";

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

  const { addItem } = useCart();

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, loading, lastResponse]);

  if (!open) return null;

  // Products recommended by Nexas AI
  const recommendedProducts = lastResponse
    ? products
        .filter((product) =>
          lastResponse.productIds.includes(product.id),
        )
        .slice(0, 6)
    : [];

  const handleSend = async () => {
    const message = text.trim();

    if (!message || loading) return;

    setText("");

    await sendMessage(message, currentProductId);
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  // Get product image safely
  const getProductImage = (product: Product) => {
    return (
      product.images?.find(
        (image) => typeof image === "string" && image.trim(),
      ) ||
      product.image ||
      ""
    );
  };

  return (
    <div
      className="
        fixed bottom-20 right-4 z-50
        flex h-[min(650px,75vh)] w-[calc(100vw-2rem)]
        max-w-md flex-col overflow-hidden
        rounded-2xl border border-yellow-500/30
        bg-background
        shadow-[0_20px_60px_rgba(0,0,0,0.45)]
        sm:bottom-24 sm:right-6
      "
    >
      {/* ================= HEADER ================= */}

      <div
        className="
          flex items-center gap-3
          border-b border-yellow-500/20
          bg-black px-4 py-3
        "
      >
        <div
          className="
            flex size-10 shrink-0 items-center justify-center
            rounded-full border border-yellow-500/30
            bg-yellow-500/10 text-yellow-400
            shadow-[0_0_18px_rgba(234,179,8,0.15)]
          "
        >
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
          className="
            text-white
            hover:bg-yellow-500/10
            hover:text-yellow-400
          "
          aria-label="Close Nexas AI"
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* ================= MESSAGES ================= */}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div
            className="
              flex min-h-full
              flex-col items-center justify-center
              text-center
            "
          >
            <div
              className="
                mb-4 flex size-16 items-center justify-center
                rounded-full border border-yellow-500/20
                bg-yellow-500/10 text-yellow-400
                shadow-[0_0_25px_rgba(234,179,8,0.12)]
              "
            >
              <Bot className="size-8" />
            </div>

            <h3 className="font-semibold">
              Hi! I'm Nexas AI 👋
            </h3>

            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Ask me about products, prices, categories,
              delivery, COD, returns, payments or anything
              about Nexas Store.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                "Kya haal hai?",
                "500 ke andar gift dikhao",
                "Electronics dikhao",
                "COD available hai?",
                "Delivery kitne din ki hai?",
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setText(question)}
                  className="
                    rounded-full
                    border border-yellow-500/20
                    bg-black/20
                    px-3 py-1.5
                    text-xs
                    transition-all
                    hover:border-yellow-500/50
                    hover:bg-yellow-500/10
                    hover:text-yellow-400
                  "
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ================= CHAT MESSAGES ================= */}

            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    isUser
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`
                      max-w-[85%]
                      rounded-2xl
                      px-3 py-2
                      text-sm
                      ${
                        isUser
                          ? `
                            rounded-br-sm
                            border border-yellow-500/20
                            bg-black
                            text-yellow-300
                          `
                          : `
                            rounded-bl-sm
                            border border-border/50
                            bg-secondary
                            text-foreground
                          `
                      }
                    `}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {/* ================= LOADING ================= */}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="
                    rounded-2xl rounded-bl-sm
                    border border-yellow-500/10
                    bg-secondary
                    px-4 py-3
                  "
                >
                  <div className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-yellow-500" />

                    <span
                      className="
                        size-1.5 animate-bounce
                        rounded-full bg-yellow-500
                      "
                      style={{
                        animationDelay: "150ms",
                      }}
                    />

                    <span
                      className="
                        size-1.5 animate-bounce
                        rounded-full bg-yellow-500
                      "
                      style={{
                        animationDelay: "300ms",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= RECOMMENDED PRODUCTS ================= */}

            {!loading &&
              lastResponse &&
              lastResponse.productIds.length > 0 && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">✨</span>

                    <p className="text-xs font-semibold text-yellow-500">
                      Recommended Products
                    </p>
                  </div>

                  {recommendedProducts.length > 0 ? (
                    <div className="space-y-3">
                      {recommendedProducts.map((product) => {
                        const image = getProductImage(product);

                        return (
                          <div
                            key={product.id}
                            className="
                              overflow-hidden
                              rounded-xl
                              border border-yellow-500/20
                              bg-card
                              transition-all
                              hover:border-yellow-500/50
                              hover:shadow-[0_0_15px_rgba(234,179,8,0.12)]
                            "
                          >
                            <div className="flex gap-3 p-2.5">
                              {/* PRODUCT IMAGE */}

                              <Link
                                to="/products/$productId"
                                params={{
                                  productId: product.id,
                                }}
                                className="
                                  relative
                                  size-20
                                  shrink-0
                                  overflow-hidden
                                  rounded-lg
                                  bg-secondary
                                "
                              >
                                {image ? (
                                  <img
                                    src={image}
                                    alt={product.name}
                                    loading="lazy"
                                    className="
                                      h-full
                                      w-full
                                      object-cover
                                    "
                                    onError={(event) => {
                                      event.currentTarget.style.display =
                                        "none";
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="
                                      flex h-full w-full
                                      items-center justify-center
                                      text-xs
                                      text-muted-foreground
                                    "
                                  >
                                    No Image
                                  </div>
                                )}

                                {/* CATEGORY */}

                                {product.category && (
                                  <span
                                    className="
                                      absolute
                                      bottom-1
                                      left-1
                                      rounded-full
                                      bg-black/80
                                      px-1.5
                                      py-0.5
                                      text-[8px]
                                      font-medium
                                      text-yellow-400
                                    "
                                  >
                                    {product.category}
                                  </span>
                                )}
                              </Link>

                              {/* PRODUCT DETAILS */}

                              <div className="min-w-0 flex-1">
                                <Link
                                  to="/products/$productId"
                                  params={{
                                    productId: product.id,
                                  }}
                                >
                                  <p
                                    className="
                                      line-clamp-2
                                      text-sm
                                      font-semibold
                                      transition-colors
                                      hover:text-yellow-400
                                    "
                                  >
                                    {product.name}
                                  </p>
                                </Link>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {product.category}
                                </p>

                                {/* PRICE */}

                                <p
                                  className="
                                    mt-1
                                    text-base
                                    font-bold
                                    text-yellow-500
                                  "
                                >
                                  Rs{" "}
                                  {Number(
                                    product.price,
                                  ).toLocaleString()}
                                </p>

                                {/* BUTTONS */}

                                <div className="mt-2 flex gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="gold"
                                    className="
                                      h-7
                                      flex-1
                                      px-2
                                      text-[10px]
                                    "
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
                                    className="
                                      h-7
                                      flex-1
                                      border-yellow-500/30
                                      px-2
                                      text-[10px]
                                      hover:border-yellow-500
                                      hover:bg-yellow-500/10
                                    "
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
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className="
                        rounded-xl
                        border border-yellow-500/20
                        bg-yellow-500/5
                        p-3
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Products were found, but they are no
                      longer available in the current catalog.
                    </div>
                  )}
                </div>
              )}

            {/* ================= SELLER CHAT ================= */}

            {!loading &&
              lastResponse?.sellerChatRequired && (
                <div
                  className="
                    rounded-xl
                    border border-yellow-500/20
                    bg-yellow-500/5
                    p-3
                  "
                >
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

      {/* ================= CLEAR ================= */}

      {messages.length > 0 && (
        <div className="border-t border-border/50 px-3 py-2">
          <button
            type="button"
            onClick={clearConversation}
            className="
              text-xs
              text-muted-foreground
              transition
              hover:text-yellow-500
            "
          >
            Clear conversation
          </button>
        </div>
      )}

      {/* ================= INPUT ================= */}

      <div
        className="
          border-t border-yellow-500/10
          bg-background
          p-3
        "
      >
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask Nexas AI..."
            disabled={loading}
            className="
              border-yellow-500/20
              focus-visible:ring-yellow-500/30
            "
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
