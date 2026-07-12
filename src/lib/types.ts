export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;

  // Multiple Images
  images?: string[];

  // Dynamic Options
  options?: {
    name: string;
    values: string[];
  }[];

  createdAt?: number;
}

export type OrderStatus = "Pending" | "Processing" | "Completed";

export interface Order {
  id: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  quantity: number;
  paymentMethod: string;
  transactionId: string;
  codFee: number;
  subtotal: number;
  totalAmount: number;
  paymentVerified: boolean;
  productName: string;
  productPrice: number;
  orderStatus: OrderStatus;
  createdAt?: number;
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
  "Completed",
];

/** Delivery/handling fee applied only to Cash on Delivery orders. */
export const COD_FEE = 60;

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
