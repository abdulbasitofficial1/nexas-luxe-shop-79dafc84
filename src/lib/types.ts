/** A configurable product option, e.g. { name: "Color", values: ["Black", "White"] }. */
export interface ProductOption {
  name: string;
  values: string[];
}

/** A single option value chosen by the customer, e.g. { name: "Color", value: "Black" }. */
export interface SelectedOption {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;

  // Multiple Images (first image is the main thumbnail)
  images?: string[];

  // Dynamic Options
  options?: ProductOption[];

  createdAt?: number;
}

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Out for Delivery"
  | "2nd Delivery Attempt"
  | "Completed"
  | "Cancelled";

export interface Order {
  id: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  quantity: number;
  paymentMethod: string;
  transactionId: string;
  codFee: number;
  deliveryCharge: number;
  subtotal: number;
  totalAmount: number;
  paymentVerified: boolean;
  productName: string;
  productPrice: number;
  productImage?: string;
  selectedOptions?: SelectedOption[];

  trackingNumber?: string;
  courierCompany?: string;

  cancelReason?: string;
  cancelledAt?: number;


  orderStatus: OrderStatus;
  userId?: string;
  userEmail?: string;
  createdAt?: number;
}
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt?: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  createdAt?: number;
}

export interface WishlistItem {
  id: string; // productId
  name: string;
  price: number;
  image: string;
  addedAt?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  message: string;
  approved: boolean;
  createdAt?: number;
}

export const PAYMENT_METHODS = [
  "EasyPaisa",
  "JazzCash",
  "Cash on Delivery",
] as const;

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Processing",
  "Out for Delivery",
  "2nd Delivery Attempt",
  "Completed",
  "Cancelled",
];

/** Delivery/handling fee applied only to Cash on Delivery orders. */
export const COD_FEE = 60;

/** Flat nationwide delivery charge (Rs). */
export const DELIVERY_CHARGE = 150;

/** Estimated delivery time shown to customers. */
export const DELIVERY_TIME = "3–5 Working Days";

/** Payment account numbers shown to customers at checkout. */
export const PAYMENT_ACCOUNTS: Record<string, string> = {
  EasyPaisa: "03225305296",
  JazzCash: "03219965754",
};

/** Payment methods that require the customer to enter a Transaction ID. */
export const TXN_PAYMENT_METHODS = [
  "EasyPaisa",
  "JazzCash",
] as const;

/** WhatsApp contact number for order cancellations (local + international format). */
export const WHATSAPP_NUMBER = "03219965754";
export const WHATSAPP_INTL = "923219965754";
