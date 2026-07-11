import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { useFirebase } from "./firebase";
import { COD_FEE, type Order, type OrderStatus, type Product, type Review } from "./types";

/**
 * Real-time reviews subscription.
 * Reviews are ordered by newest first and filtered client-side so no
 * composite Firestore index is required. Pass `approvedOnly` for the
 * public storefront; the admin dashboard passes `false` to see everything.
 */
export function useReviews(approvedOnly = true) {
  const { db, ready } = useFirebase();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      if (ready) setLoading(false);
      return;
    }
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) }));
        setReviews(approvedOnly ? all.filter((r) => r.approved) : all);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready, approvedOnly]);

  return { reviews, loading };
}

export interface NewReviewInput {
  customerName: string;
  rating: number;
  message: string;
}

export async function submitReview(db: Firestore, input: NewReviewInput) {
  await addDoc(collection(db, "reviews"), {
    customerName: input.customerName,
    rating: input.rating,
    message: input.message,
    approved: false,
    createdAt: Date.now(),
  });
}

export async function approveReview(db: Firestore, id: string, approved: boolean) {
  await updateDoc(doc(db, "reviews", id), { approved });
}

export async function deleteReview(db: Firestore, id: string) {
  await deleteDoc(doc(db, "reviews", id));
}


/** Real-time products subscription. */
export function useProducts() {
  const { db, ready } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      if (ready) setLoading(false);
      return;
    }
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready]);

  return { products, loading };
}

/** Real-time orders subscription (admin). */
export function useOrders() {
  const { db, ready } = useFirebase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      if (ready) setLoading(false);
      return;
    }
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready]);

  return { orders, loading };
}

const NOTIFY_EMAIL = "asifabdulbasit7@gmail.com";

export interface NewOrderInput {
  customerName: string;
  phoneNumber: string;
  address: string;
  quantity: number;
  paymentMethod: string;
  transactionId: string;
  productName: string;
  productPrice: number;
}

export async function placeOrder(db: Firestore, input: NewOrderInput) {
  const createdAt = Date.now();
  const subtotal = input.productPrice * input.quantity;
  const codFee = input.paymentMethod === "Cash on Delivery" ? COD_FEE : 0;
  const totalAmount = subtotal + codFee;

  const order: Omit<Order, "id"> = {
    customerName: input.customerName,
    phoneNumber: input.phoneNumber,
    address: input.address,
    quantity: input.quantity,
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId,
    codFee,
    subtotal,
    totalAmount,
    paymentVerified: false,
    productName: input.productName,
    productPrice: input.productPrice,
    orderStatus: "Pending",
    createdAt,
  };
  await addDoc(collection(db, "orders"), order);

  // Queue an email notification. If the Firebase "Trigger Email" extension is
  // installed on the project, documents in the `mail` collection are sent
  // automatically to the configured address.
  const when = new Date(createdAt).toLocaleString();
  await addDoc(collection(db, "mail"), {
    to: [NOTIFY_EMAIL],
    message: {
      subject: `New NexasStore Order — ${input.productName}`,
      html: `
        <h2>New Order Received</h2>
        <table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">
          <tr><td><b>Product</b></td><td>${input.productName}</td></tr>
          <tr><td><b>Price</b></td><td>Rs ${input.productPrice.toLocaleString()}</td></tr>
          <tr><td><b>Quantity</b></td><td>${input.quantity}</td></tr>
          <tr><td><b>Subtotal</b></td><td>Rs ${subtotal.toLocaleString()}</td></tr>
          <tr><td><b>COD Fee</b></td><td>Rs ${codFee.toLocaleString()}</td></tr>
          <tr><td><b>Total</b></td><td>Rs ${totalAmount.toLocaleString()}</td></tr>
          <tr><td><b>Customer</b></td><td>${input.customerName}</td></tr>
          <tr><td><b>Phone</b></td><td>${input.phoneNumber}</td></tr>
          <tr><td><b>Address</b></td><td>${input.address}</td></tr>
          <tr><td><b>Payment</b></td><td>${input.paymentMethod}</td></tr>
          <tr><td><b>Transaction ID</b></td><td>${input.transactionId || "—"}</td></tr>
          <tr><td><b>Date</b></td><td>${when}</td></tr>
          <tr><td><b>Status</b></td><td>Pending</td></tr>
        </table>`,
    },
    createdAt: serverTimestamp(),
  });
}

export async function updateOrderStatus(db: Firestore, id: string, status: OrderStatus) {
  await updateDoc(doc(db, "orders", id), { orderStatus: status });
}

export async function updatePaymentVerified(db: Firestore, id: string, verified: boolean) {
  await updateDoc(doc(db, "orders", id), { paymentVerified: verified });
}

export interface ProductInput {
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
}

export async function addProduct(db: Firestore, input: ProductInput) {
  await addDoc(collection(db, "products"), { ...input, createdAt: Date.now() });
}

export async function updateProduct(db: Firestore, id: string, input: ProductInput) {
  await updateDoc(doc(db, "products", id), { ...input });
}

export async function deleteProduct(db: Firestore, id: string) {
  await deleteDoc(doc(db, "products", id));
}
