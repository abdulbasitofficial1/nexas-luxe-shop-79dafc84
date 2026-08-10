import { useState } from "react";
import { useFirebase } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TrackOrder() {
  const { db } = useFirebase();

  const [trackingId, setTrackingId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const trackOrder = async () => {
    if (!db || !trackingId) return;

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("trackingId", "==", trackingId.trim())
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      setOrder(snap.docs[0].data());
    } else {
      setOrder(null);
      alert("Order not found");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Track Your Order
      </h1>

      <Input
        placeholder="Enter Tracking ID (NX123456)"
        value={trackingId}
        onChange={(e) => setTrackingId(e.target.value)}
      />

      <Button 
        className="w-full"
        onClick={trackOrder}
        disabled={loading}
      >
        {loading ? "Searching..." : "Track Order"}
      </Button>


      {order && (
        <div className="border rounded-lg p-4 space-y-2">

          <p>
            <b>Product:</b> {order.productName}
          </p>

          <p>
            <b>Name:</b> {order.customerName}
          </p>

          <p>
            <b>Status:</b> {order.orderStatus}
          </p>

          <p>
            <b>Total:</b> Rs {order.totalAmount}
          </p>

          <p>
            <b>Tracking ID:</b> {order.trackingId}
          </p>

        </div>
      )}

    </div>
  );
}
