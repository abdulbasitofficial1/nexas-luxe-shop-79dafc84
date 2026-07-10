export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
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
  productName: string;
  productPrice: number;
  orderStatus: OrderStatus;
  createdAt?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export const PAYMENT_METHODS = ["EasyPaisa", "JazzCash", "Cash on Delivery"] as const;
export const ORDER_STATUSES: OrderStatus[] = ["Pending", "Processing", "Completed"];
