import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase } from "@/lib/firebase";
import { useUI } from "@/lib/ui-context";
import {
  aggregateByProduct,
  computeStats,
  downloadCsv,
  profitsToCsv,
  startOfMonth,
  startOfToday,
  startOfWeek,
  useProfits,
  type ProfitRecord,
} from "@/lib/profits";

export const Route = createFileRoute("/admin/profit")({
  head: () => ({
    meta: [
      { title: "Profit Dashboard — NexasStore Admin" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Track profit per completed order, daily/weekly/monthly totals and product analytics.",
      },
      {
        property: "og:title",
        content: "Profit Dashboard — NexasStore Admin",
      },
      {
        property: "og:description",
        content:
          "Track profit per completed order, daily/weekly/monthly totals and product analytics.",
      },
    ],
  }),
  component: ProfitDashboard,
});

type RangeKey = "all" | "today" | "week" | "month" | "custom";

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString()}`;

function ProfitDashboard() {
  const { user, ready, db } = useFirebase();
  const { openAdminLogin } = useUI();
  const { profits, loading } = useProfits();

  const [range, setRange] = useState<RangeKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    let rows = profits;

    if (range === "today") {
      rows = rows.filter((r) => r.completedDate >= startOfToday());
    } else if (range === "week") {
      rows = rows.filter((r) => r.completedDate >= startOfWeek());
    } else if (range === "month") {
      rows = rows.filter((r) => r.completedDate >= startOfMonth());
    } else if (range === "custom") {
      const start = from
        ? new Date(from + "T00:00:00").getTime()
        : 0;

      const end = to
        ? new Date(to + "T23:59:59").getTime()
        : Infinity;

      rows = rows.filter(
        (r) =>
          r.completedDate >= start &&
          r.completedDate <= end,
      );
    }

    const t = term.trim().toLowerCase();

    if (t) {
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(t) ||
          r.customerName.toLowerCase().includes(t) ||
          r.orderId.toLowerCase().includes(t),
      );
    }

    return rows;
  }, [profits, range, from, to, term]);

  const stats = useMemo(
    () => computeStats(profits),
    [profits],
  );

  const byProduct = useMemo(
    () => aggregateByProduct(filtered),
    [filtered],
  );

  const topSelling = useMemo(
    () =>
      [...byProduct]
        .sort((a, b) => b.units - a.units)
        .slice(0, 5),
    [byProduct],
  );

  const highestProfit = useMemo(
    () =>
      [...byProduct]
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5),
    [byProduct],
  );

  const lowestProfit = useMemo(
    () =>
      [...byProduct]
        .sort((a, b) => a.profit - b.profit)
        .slice(0, 5),
    [byProduct],
  );

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldAlert className="mx-auto size-12 text-primary" />

        <h1 className="mt-4 font-display text-2xl font-bold">
          Admin Access Required
        </h1>

        <p className="mt-2 text-muted-foreground">
          You must be signed in as an administrator to view this page.
        </p>

        <Button
          variant="gold"
          className="mt-6"
          onClick={openAdminLogin}
        >
          Admin Login
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Profit{" "}
            <span className="text-gold-gradient">
              Dashboard
            </span>
          </h1>

          <p className="text-sm text-muted-foreground">
            Profit recorded on every completed order.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="goldOutline">
            <Link to="/admin">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          </Button>

          <Button
            variant="gold"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv(
                `nexas-profit-${new Date()
                  .toISOString()
                  .slice(0, 10)}.csv`,
                profitsToCsv(filtered),
              )
            }
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Profit"
          value={rs(stats.total)}
          accent
        />

        <StatCard
          label="Today's Profit"
          value={rs(stats.today)}
        />

        <StatCard
          label="This Week's Profit"
          value={rs(stats.week)}
        />

        <StatCard
          label="This Month's Profit"
          value={rs(stats.month)}
        />

        <StatCard
          label="Total Completed Orders"
          value={String(stats.count)}
        />

        <StatCard
          label="Average Profit / Order"
          value={rs(stats.average)}
        />
      </div>

      {/* Filters */}
      <div className="mt-8 space-y-3 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All Time"],
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["custom", "Custom Range"],
            ] as [RangeKey, string][]
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={
                range === key
                  ? "gold"
                  : "goldOutline"
              }
              onClick={() => setRange(key)}
            >
              {label}
            </Button>
          ))}

          <Input
            placeholder="Search product, customer or order..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="ml-auto w-full sm:max-w-xs"
          />
        </div>

        {range === "custom" && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-from">
                From
              </Label>

              <Input
                id="pf-from"
                type="date"
                value={from}
                onChange={(e) =>
                  setFrom(e.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pf-to">
                To
              </Label>

              <Input
                id="pf-to"
                type="date"
                value={to}
                onChange={(e) =>
                  setTo(e.target.value)
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <h2 className="mt-8 font-display text-xl font-semibold">
        Profit History
      </h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No profit records for this range.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Image
                </th>

                <th className="px-4 py-3 font-medium">
                  Product
                </th>

                <th className="px-4 py-3 font-medium">
                  Customer
                </th>

                <th className="px-4 py-3 font-medium">
                  Qty
                </th>

                <th className="px-4 py-3 font-medium">
                  Sale Price
                </th>

                <th className="px-4 py-3 font-medium">
                  Profit
                </th>

                <th className="px-4 py-3 font-medium">
                  Date
                </th>

                <th className="px-4 py-3 font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <ProfitRow
                  key={r.id}
                  row={r}
                  db={db}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics */}
      <h2 className="mt-10 font-display text-xl font-semibold">
        Product Analytics
      </h2>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <AnalyticsCard
          title="Top Selling Products"
          icon={
            <Trophy className="size-4 text-primary" />
          }
          rows={topSelling.map((p) => ({
            name: p.productName,
            image: p.productImage,
            value: `${p.units} sold`,
          }))}
        />

        <AnalyticsCard
          title="Highest Profit Products"
          icon={
            <TrendingUp className="size-4 text-green-400" />
          }
          rows={highestProfit.map((p) => ({
            name: p.productName,
            image: p.productImage,
            value: rs(p.profit),
          }))}
        />

        <AnalyticsCard
          title="Lowest Profit Products"
          icon={
            <TrendingDown className="size-4 text-red-400" />
          }
          rows={lowestProfit.map((p) => ({
            name: p.productName,
            image: p.productImage,
            value: rs(p.profit),
          }))}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p
        className={`mt-1 font-display text-2xl font-bold ${
          accent
            ? "text-gold-gradient"
            : "text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const fallbackImg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='100%25' height='100%25' fill='%23222'/></svg>";

function ProfitRow({
  row,
  db,
}: {
  row: ProfitRecord;
  db: ReturnType<typeof useFirebase>["db"];
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this profit record?\n\nProduct: ${row.productName}\nProfit: ${rs(row.profitAmount)}`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await deleteDoc(
        doc(db, "profits", row.id),
      );
    } catch (error) {
      console.error(
        "Failed to delete profit:",
        error,
      );

      window.alert(
        "Failed to delete profit record. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-4 py-3">
        <img
          ref={ref}
          src={row.productImage || fallbackImg}
          alt={row.productName}
          className="size-12 rounded-md object-cover"
          onError={(e) => {
            (
              e.currentTarget as HTMLImageElement
            ).src = fallbackImg;
          }}
        />
      </td>

      <td className="max-w-[220px] px-4 py-3">
        <span className="line-clamp-2">
          {row.productName}
        </span>
      </td>

      <td className="px-4 py-3">
        {row.customerName}
      </td>

      <td className="px-4 py-3">
        {row.quantity}
      </td>

      <td className="px-4 py-3">
        {rs(row.salePrice)}
      </td>

      <td className="px-4 py-3 font-semibold text-primary">
        {rs(row.profitAmount)}
      </td>

      <td className="px-4 py-3 text-muted-foreground">
        {new Date(
          row.completedDate,
        ).toLocaleDateString()}
      </td>

      <td className="px-4 py-3">
        <Button
          variant="destructive"
          size="sm"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}

          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </td>
    </tr>
  );
}

function AnalyticsCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: {
    name: string;
    image?: string;
    value: string;
  }[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}

        <h3 className="font-semibold">
          {title}
        </h3>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No data yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm"
            >
              <img
                src={r.image || fallbackImg}
                alt=""
                className="size-9 shrink-0 rounded-md object-cover"
                onError={(e) => {
                  (
                    e.currentTarget as HTMLImageElement
                  ).src = fallbackImg;
                }}
              />

              <span className="line-clamp-1 flex-1">
                {r.name}
              </span>

              <span className="shrink-0 font-medium text-primary">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
