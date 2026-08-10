/**
 * Profit tracking.
 *
 * When an admin marks an order Completed they record how much profit the order
 * produced. Records live in the `profits` collection, keyed by the order id so
 * the same order can never be recorded twice.
 */

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { useFirebase } from "./firebase";

export interface ProfitRecord {
  id: string; // === orderId / Firestore document ID
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  customerName: string;
  quantity: number;
  salePrice: number;
  profitAmount: number;
  completedDate: number;
  completedBy: string;
}

export interface ProfitInput {
  orderId: string;
  productId?: string;
  productName: string;
  productImage?: string;
  customerName: string;
  quantity: number;
  salePrice: number;
  profitAmount: number;
  completedBy: string;
}

/**
 * True when a profit entry already exists for this order.
 */
export async function profitExists(
  db: Firestore,
  orderId: string,
) {
  const snap = await getDoc(
    doc(db, "profits", orderId),
  );

  return snap.exists();
}

/**
 * Save a profit record.
 * Never overwrites an existing one.
 */
export async function saveProfit(
  db: Firestore,
  input: ProfitInput,
) {
  const ref = doc(
    db,
    "profits",
    input.orderId,
  );

  const existing = await getDoc(ref);

  if (existing.exists()) {
    throw new Error(
      "Profit already recorded for this order.",
    );
  }

  const record: Omit<ProfitRecord, "id"> = {
    orderId: input.orderId,
    productId: input.productId ?? "",
    productName: input.productName,
    productImage: input.productImage ?? "",
    customerName: input.customerName,
    quantity: input.quantity,
    salePrice: input.salePrice,
    profitAmount: input.profitAmount,
    completedDate: Date.now(),
    completedBy: input.completedBy,
  };

  await setDoc(ref, record);
}

/**
 * Delete a profit record.
 *
 * The document ID is the same as the orderId because saveProfit()
 * stores every profit record using the orderId as its document ID.
 *
 * Firestore Security Rules must allow delete for the admin.
 */
export async function deleteProfit(
  db: Firestore,
  orderId: string,
) {
  if (!orderId) {
    throw new Error(
      "Cannot delete profit: missing order ID.",
    );
  }

  const ref = doc(
    db,
    "profits",
    orderId,
  );

  const existing = await getDoc(ref);

  if (!existing.exists()) {
    throw new Error(
      "Profit record not found.",
    );
  }

  await deleteDoc(ref);
}

/**
 * Real-time profits subscription.
 * Newest first.
 */
export function useProfits() {
  const { db, ready } = useFirebase();

  const [profits, setProfits] = useState<
    ProfitRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!db) {
      if (ready) {
        setLoading(false);
      }

      return;
    }

    const unsub = onSnapshot(
      collection(db, "profits"),

      (snap) => {
        const all = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<
            ProfitRecord,
            "id"
          >),
        }));

        all.sort(
          (a, b) =>
            (b.completedDate ?? 0) -
            (a.completedDate ?? 0),
        );

        setProfits(all);
        setLoading(false);
      },

      (error) => {
        console.error(
          "Profit subscription error:",
          error,
        );

        setLoading(false);
      },
    );

    return unsub;
  }, [db, ready]);

  return {
    profits,
    loading,
  };
}

// -----------------------------------------------------------------------------
// Date ranges
// -----------------------------------------------------------------------------

export function startOfToday(
  d = new Date(),
) {
  const x = new Date(d);

  x.setHours(0, 0, 0, 0);

  return x.getTime();
}

/**
 * Week starts on Monday.
 */
export function startOfWeek(
  d = new Date(),
) {
  const x = new Date(d);

  x.setHours(0, 0, 0, 0);

  const day =
    (x.getDay() + 6) % 7;

  x.setDate(
    x.getDate() - day,
  );

  return x.getTime();
}

export function startOfMonth(
  d = new Date(),
) {
  const x = new Date(d);

  x.setHours(0, 0, 0, 0);

  x.setDate(1);

  return x.getTime();
}

export const sum = (
  rows: ProfitRecord[],
) =>
  rows.reduce(
    (total, row) =>
      total +
      (row.profitAmount || 0),
    0,
  );

export interface ProfitStats {
  total: number;
  today: number;
  week: number;
  month: number;
  count: number;
  average: number;
}

export function computeStats(
  rows: ProfitRecord[],
): ProfitStats {
  const t = startOfToday();
  const w = startOfWeek();
  const m = startOfMonth();

  const total = sum(rows);

  return {
    total,

    today: sum(
      rows.filter(
        (r) =>
          r.completedDate >= t,
      ),
    ),

    week: sum(
      rows.filter(
        (r) =>
          r.completedDate >= w,
      ),
    ),

    month: sum(
      rows.filter(
        (r) =>
          r.completedDate >= m,
      ),
    ),

    count: rows.length,

    average: rows.length
      ? total / rows.length
      : 0,
  };
}

export interface ProductAggregate {
  productId: string;
  productName: string;
  productImage?: string;
  units: number;
  profit: number;
  orders: number;
}

/**
 * Group profit records per product
 * for the analytics section.
 */
export function aggregateByProduct(
  rows: ProfitRecord[],
): ProductAggregate[] {
  const map = new Map<
    string,
    ProductAggregate
  >();

  for (const r of rows) {
    const key =
      r.productId ||
      r.productName;

    const cur =
      map.get(key) ??
      {
        productId: r.productId,
        productName:
          r.productName,
        productImage:
          r.productImage,
        units: 0,
        profit: 0,
        orders: 0,
      };

    cur.units +=
      r.quantity || 0;

    cur.profit +=
      r.profitAmount || 0;

    cur.orders += 1;

    if (
      !cur.productImage &&
      r.productImage
    ) {
      cur.productImage =
        r.productImage;
    }

    map.set(key, cur);
  }

  return Array.from(
    map.values(),
  );
}

/**
 * Build a CSV string of the given
 * profit rows.
 */
export function profitsToCsv(
  rows: ProfitRecord[],
): string {
  const head = [
    "Order ID",
    "Product",
    "Customer",
    "Quantity",
    "Sale Price",
    "Profit",
    "Date",
    "Completed By",
  ];

  const esc = (
    v: string | number,
  ) =>
    `"${String(v).replace(
      /"/g,
      '""',
    )}"`;

  const lines = rows.map(
    (r) =>
      [
        r.orderId,
        r.productName,
        r.customerName,
        r.quantity,
        r.salePrice,
        r.profitAmount,
        new Date(
          r.completedDate,
        ).toLocaleString(),
        r.completedBy,
      ]
        .map(esc)
        .join(","),
  );

  return [
    head.map(esc).join(","),
    ...lines,
  ].join("\n");
}

export function downloadCsv(
  filename: string,
  csv: string,
) {
  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;
  a.download = filename;

  a.click();

  URL.revokeObjectURL(url);
}
