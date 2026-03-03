import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const SCHEMA = "bastar_marathon";
const TABLE = "registrations";

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString();

type StatCardProps = {
  label: string;
  subtitle?: string;
  value: number;
  color: string;
  bg: string;
};

const StatCard = ({ label, subtitle, value, color, bg }: StatCardProps) => (
  <div className="flex-1 min-w-[160px] bg-white rounded-2xl p-5 flex items-center gap-3.5 shadow-sm border border-gray-200">
    <div className={`w-12 h-12 rounded-xl ${bg} flex-shrink-0`} />
    <div>
      <p className="m-0 text-xs text-gray-500 font-medium">{label}</p>
      {subtitle && (
        <p className="m-0 text-[10px] text-gray-300 font-mono">{subtitle}</p>
      )}
      <p className={`m-0 text-3xl font-bold leading-none ${color}`}>
        {fmt(value)}
      </p>
    </div>
  </div>
);

type RegistrationRow = {
  city: string | null;
  state: string | null;
  wants_tshirt: boolean | null;
  t_shirt_size: string | null;
  payment_status: string | null;
  category: string | null;
  gender: string | null;
  created_at: string | null;
};

export default function MarathonDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RegistrationRow[]>([]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      let all: RegistrationRow[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .schema(SCHEMA)
          .from(TABLE)
          .select(
            "city, state, wants_tshirt, t_shirt_size, payment_status, category, gender, created_at",
          )
          .range(from, from + pageSize - 1);
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        if (data) {
          all = [...all, ...(data as RegistrationRow[])];
        }
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      setRows(all);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total = rows.length;
  const paid = rows.filter((r) => r.payment_status === "DONE").length;
  const offline = rows.filter((r) => r.payment_status === "OFFLINE").length;
  const tshirtWanted = rows.filter((r) => r.wants_tshirt).length;

  // City breakdown
  const cityMap: Record<
    string,
    {
      city: string;
      tshirt: number;
      total: number;
      paid: number;
      offline: number;
    }
  > = {};
  rows.forEach((r) => {
    const c = r.city || "Unknown";
    if (!cityMap[c])
      cityMap[c] = { city: c, tshirt: 0, total: 0, paid: 0, offline: 0 };
    cityMap[c].total += 1;
    if (r.wants_tshirt) cityMap[c].tshirt += 1;
    if (r.payment_status === "DONE") cityMap[c].paid += 1;
    if (r.payment_status === "OFFLINE") cityMap[c].offline += 1;
  });
  const cityRows = Object.values(cityMap).sort((a, b) => b.total - a.total);

  // T-shirt size breakdown (only for wants_tshirt = true)
  const sizeOrder = ["S", "M", "L", "XL", "XXL"];
  const sizeMap: Record<string, number> = {};
  rows.forEach((r) => {
    if (!r.wants_tshirt) return;
    const s = r.t_shirt_size || "Unknown";
    sizeMap[s] = (sizeMap[s] || 0) + 1;
  });
  const sizeData = sizeOrder.map((s) => ({ size: s, count: sizeMap[s] || 0 }));

  // Category breakdown
  const catMap: Record<string, number> = {};
  rows.forEach((r) => {
    const c = r.category || "Unknown";
    catMap[c] = (catMap[c] || 0) + 1;
  });
  const catData = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Gender breakdown
  const genderMap: Record<string, number> = {};
  rows.forEach((r) => {
    const g = r.gender || "Unknown";
    genderMap[g] = (genderMap[g] || 0) + 1;
  });

  // Daily registration trend
  const dayMap: Record<
    string,
    { date: string; DONE: number; OFFLINE: number }
  > = {};
  rows.forEach((r) => {
    const d = r.created_at?.slice(0, 10);
    if (!d) return;
    if (!dayMap[d]) dayMap[d] = { date: d, DONE: 0, OFFLINE: 0 };
    if (r.payment_status === "DONE") dayMap[d].DONE += 1;
    if (r.payment_status === "OFFLINE") dayMap[d].OFFLINE += 1;
  });
  const chartData = Object.values(dayMap).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  if (loading)
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center font-sans">
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 m-0 text-sm">Loading marathon data…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-300 rounded-xl py-5 px-8 text-red-600">
          Error: {error}
        </div>
      </div>
    );

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-900 p-7">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            BM
          </div>
          <h1 className="m-0 text-xl font-bold">BASTAR Marathon 2026</h1>
        </div>
        <span className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
          🕐 Updated: {new Date().toLocaleString()}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-3.5 flex-wrap mb-4">
        <StatCard
          label="Total Registrations Tried"
          value={total}
          color="text-black"
          bg="bg-black/10"
        />
        <StatCard
          label="Successfull Registrations"
          value={paid}
          color="text-green-600"
          bg="bg-green-100"
        />
        {/*<StatCard
          label="Offline Registrations"
          value={offline}
          color="text-orange-600"
          bg="bg-orange-100"
        />*/}
        <StatCard
          label="T-Shirt Orders"
          value={tshirtWanted}
          color="text-blue-600"
          bg="bg-blue-100"
        />
      </div>

      {/* Row 2: City table + Daily trend */}
      <div className="flex gap-4 flex-wrap mb-4">
        {/* City table */}
        <div className="flex-1 min-w-[360px] bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <p className="m-0 mb-3.5 text-xs font-semibold text-gray-500 tracking-wider uppercase">
            Registrations by City
          </p>
          <div className="max-h-72 overflow-y-auto pr-1.5">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["City", "Tried", "Success", "T-Shirt"].map((h) => (
                    <th
                      key={h}
                      className="sticky top-0 bg-white z-10 pb-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide border-b-2 border-gray-200"
                      style={{ textAlign: h === "City" ? "left" : "right" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cityRows.map((r, i) => (
                  <tr
                    key={r.city}
                    className={`border-t border-gray-200 ${i % 2 === 0 ? "" : "bg-gray-50"}`}
                  >
                    <td className="py-2 font-medium">{r.city}</td>

                    <td className="text-right font-bold">{fmt(r.total)}</td>
                    <td className="text-right text-green-600">{fmt(r.paid)}</td>
                    <td className="text-right text-blue-600">
                      {fmt(r.tshirt)}
                    </td>
                    {/*<td className="text-right text-orange-600 pr-1">
                      {fmt(r.offline)}
                    </td>*/}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Trend chart */}
        <div className="flex-[2] min-w-[400px] bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <p className="m-0 mb-3.5 text-xs font-semibold text-gray-500 tracking-wider uppercase">
            Daily Registration Trend
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="DONE"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="Online (DONE)"
              />
              {/*<Line
                type="monotone"
                dataKey="OFFLINE"
                stroke="#ea580c"
                strokeWidth={2}
                dot={false}
                name="Offline"
              />*/}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: T-shirt sizes + Category + Gender */}
      <div className="flex gap-4 flex-wrap">
        {/* T-shirt sizes bar chart */}
        <div className="flex-1 min-w-[240px] bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <p className="m-0 mb-3.5 text-xs font-semibold text-gray-500 tracking-wider uppercase">
            T-Shirt Sizes
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sizeData} barSize={32}>
              <XAxis
                dataKey="size"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                name="Count"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="flex-1 min-w-[200px] bg-white rounded-2xl p-5 shadow-sm border border-gray-200 overflow-auto">
          <p className="m-0 mb-3.5 text-xs font-semibold text-gray-500 tracking-wider uppercase">
            By Category
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-500 text-xs uppercase pb-2">
                  Category
                </th>
                <th className="text-right text-gray-500 text-xs uppercase pb-2">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {catData.map((r) => (
                <tr key={r.name} className="border-t border-gray-200">
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="text-right">
                    <span className="bg-blue-100 text-blue-600 rounded-md px-2 py-0.5 font-semibold text-xs">
                      {fmt(r.count)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gender breakdown */}
        <div className="flex-1 min-w-[200px] bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <p className="m-0 mb-3.5 text-xs font-semibold text-gray-500 tracking-wider uppercase">
            By Gender
          </p>
          <div className="flex flex-col gap-3 mt-1">
            {Object.entries(genderMap).map(([g, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const colorClass =
                g === "Male"
                  ? "bg-blue-600"
                  : g === "Female"
                    ? "bg-pink-600"
                    : "bg-teal-600";
              return (
                <div key={g}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="font-medium">{g}</span>
                    <span className="text-gray-500">
                      {fmt(count)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className={`h-2 ${colorClass} rounded-full transition-all duration-600`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
