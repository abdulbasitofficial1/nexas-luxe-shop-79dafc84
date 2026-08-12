import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { collection, getDocs, query, where } from "firebase/firestore";

import { useFirebase } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/track-order")({
  component: TrackOrder,
});

function TrackOrder() {
  const { db } = useFirebase();

  const [trackingId, setTrackingId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trackOrder = async () => {
    const id = trackingId.trim().toUpperCase();

    if (!id) {
      setError("Please enter your Tracking ID.");
      setOrder(null);
      return;
    }

    if (!db) {
      setError("Unable to connect to the store database.");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const q = query(
        collection(db, "orders"),
        where("trackingId", "==", id)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Order not found. Please check your Tracking ID.");
        return;
      }

      setOrder({
        id: snap.docs[0].id,
        ...snap.docs[0].data(),
      });
    } catch (err) {
      console.error("Track order error:", err);
      setError("Something went wrong while tracking your order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <div className="rounded-2xl border bg-background p-5 shadow-lg sm:p-6">
        <h1 className="text-2xl font-bold">Track Your Order</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Enter your Tracking ID to check your order status.
        </p>

        <div className="mt-5 space-y-3">
          <Input
            placeholder="Enter Tracking ID (NX123456)"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                trackOrder();
              }
            }}
          />

          <Button
            className="w-full"
            onClick={trackOrder}
            disabled={loading}
          >
            {loading ? "Searching..." : "Track Order"}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {order && (
          <div className="mt-5 space-y-3 rounded-xl border p-4">
            <h2 className="text-lg font-semibold">Order Details</h2>

            <p>
              <b>Tracking ID:</b>{" "}
              {order.trackingId || "N/A"}
            </p>

            <p>
              <b>Product:</b>{" "}
              {order.productName || order.product?.name || "N/A"}
            </p>

            <p>
              <b>Name:</b>{" "}
              {order.customerName || order.name || "N/A"}
            </p>

            <p>
              <b>Status:</b>{" "}
              {order.orderStatus || order.status || "Pending"}
            </p>

            <p>
              <b>Total:</b> Rs{" "}
              {Number(order.totalAmount || 0).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}