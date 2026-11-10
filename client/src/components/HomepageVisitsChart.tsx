import { VISIT_COUNT_FONT_PX, type VisitBar } from "@shared/homepageVisits";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const WEEKDAY_COLOR = "var(--chart-1)";
const WEEKEND_COLOR = "var(--chart-5)";

function CountLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const value = Number(props.value);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(value))
    return null;

  const cx = x + width / 2;
  const cy = y - 2;
  return (
    <text
      x={cx}
      y={cy}
      fill="#e8e8ef"
      fontSize={VISIT_COUNT_FONT_PX}
      textAnchor="start"
      transform={`rotate(-90 ${cx} ${cy})`}
    >
      {value.toLocaleString()}
    </text>
  );
}

export function HomepageVisitsChart({ bars }: { bars: VisitBar[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bars}
          margin={{ top: 52, right: 4, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.1)"
          />
          <XAxis
            dataKey="label"
            interval={4}
            stroke="#888"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              backgroundColor: "rgba(20, 20, 30, 0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(value: number) => [
              `${Number(value).toLocaleString()}회`,
              "GA4 조회",
            ]}
            labelFormatter={(_label, payload) => {
              const row = payload?.[0]?.payload as VisitBar | undefined;
              return row ? `${row.date} · ${row.kind}` : "";
            }}
          />
          <Bar
            dataKey="views"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            label={<CountLabel />}
          >
            {bars.map(bar => (
              <Cell
                key={bar.date}
                fill={bar.kind === "주말" ? WEEKEND_COLOR : WEEKDAY_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const VISIT_WEEKDAY_COLOR = WEEKDAY_COLOR;
export const VISIT_WEEKEND_COLOR = WEEKEND_COLOR;
