import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PriceHistoryChartProps {
  data: Array<{
    date: string;
    price: number;
  }>;
  currency?: string;
}

export function PriceHistoryChart({ data, currency = "$" }: PriceHistoryChartProps) {
  return (
    <Card className="p-6 rounded-2xl glass" data-testid="card-price-history">
      <h3 className="text-lg font-semibold font-display mb-4">Price History</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `${currency}${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${currency}${value.toFixed(2)}`, "Price"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 6 }}
            fill="url(#priceGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
