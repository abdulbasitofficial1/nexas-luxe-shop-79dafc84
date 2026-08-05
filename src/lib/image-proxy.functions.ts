/**
 * Server-side image fetcher.
 *
 * Remote catalog images (Markaz / WooCommerce CDNs) do not send CORS headers,
 * so the browser cannot download them directly for re-upload. This server
 * function fetches the bytes and returns them base64-encoded so the client can
 * turn them into a Blob and push them to Firebase Storage.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ url: z.string().url() });

/** Hard cap so a single malicious/huge asset cannot stall an import. */
const MAX_BYTES = 8 * 1024 * 1024;

export const fetchRemoteImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const res = await fetch(data.url, {
      headers: {
        // Some CDNs reject requests without a browser-ish UA / referer.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
      },
    });

    if (!res.ok) {
      return { ok: false as const, error: `HTTP ${res.status}` };
    }

    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (contentType && !contentType.startsWith("image/")) {
      return { ok: false as const, error: `not an image (${contentType})` };
    }

    const buffer = await res.arrayBuffer();
    if (!buffer.byteLength) return { ok: false as const, error: "empty response" };
    if (buffer.byteLength > MAX_BYTES) return { ok: false as const, error: "image too large" };

    // Chunked conversion avoids blowing the call stack on large buffers.
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }

    return {
      ok: true as const,
      contentType: contentType || "image/jpeg",
      base64: btoa(binary),
    };
  });
