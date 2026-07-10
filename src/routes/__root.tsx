import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { FirebaseProvider } from "@/lib/firebase";
import { CartProvider } from "@/lib/cart-context";
import { UIProvider } from "@/lib/ui-context";
import { Navbar } from "@/components/nexas/Navbar";
import { Footer } from "@/components/nexas/Footer";
import { AdminLoginModal } from "@/components/nexas/AdminLoginModal";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gold-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-gold"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NexasStore — Premium Online Shopping in Pakistan" },
      {
        name: "description",
        content:
          "NexasStore offers a curated luxury shopping experience in Pakistan. Premium products, secure ordering, and fast delivery with EasyPaisa, JazzCash & Cash on Delivery.",
      },
      { name: "author", content: "NexasStore" },
      { property: "og:title", content: "NexasStore — Premium Online Shopping in Pakistan" },
      {
        property: "og:description",
        content:
          "NexasStore offers a curated luxury shopping experience in Pakistan. Premium products, secure ordering, and fast delivery with EasyPaisa, JazzCash & Cash on Delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NexasStore — Premium Online Shopping in Pakistan" },
      { name: "twitter:description", content: "NexasStore offers a curated luxury shopping experience in Pakistan. Premium products, secure ordering, and fast delivery with EasyPaisa, JazzCash & Cash on Delivery." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b192f61e-8086-427f-909b-234865c432ff/id-preview-68b18ee4--b5cccce6-0b15-407a-9b2e-cb6a9ff57784.lovable.app-1783677880304.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b192f61e-8086-427f-909b-234865c432ff/id-preview-68b18ee4--b5cccce6-0b15-407a-9b2e-cb6a9ff57784.lovable.app-1783677880304.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800;900&family=Poppins:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseProvider>
        <UIProvider>
          <CartProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                {/* Nested routes render here. */}
                <Outlet />
              </main>
              <Footer />
            </div>
            <AdminLoginModal />
            <Toaster position="top-center" richColors />
          </CartProvider>
        </UIProvider>
      </FirebaseProvider>
    </QueryClientProvider>
  );
}
