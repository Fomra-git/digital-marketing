"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Single series: one validated hue (#0D9488 passes lightness, chroma and
// contrast checks on the white card surface). The card title names the series.
const BAR = "#0D9488";

export function StatusChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  return (
    <div>
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
            barCategoryGap="35%"
          >
            <CartesianGrid vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748B", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748B", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(100,116,139,0.08)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                fontSize: 12,
                color: "#1E293B",
              }}
              formatter={(value) => [value, "Projects"]}
            />
            <Bar
              dataKey="count"
              fill={BAR}
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Projects by status</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
