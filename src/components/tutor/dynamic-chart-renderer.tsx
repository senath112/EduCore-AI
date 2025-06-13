
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart, PieChart, Pie, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartDataItem {
  name: string; // Corresponds to label (e.g., on X-axis, slice name)
  value: number; // Corresponds to the data value (e.g., bar height, line point, slice value)
  [key: string]: any;
}

interface DynamicChartRendererProps {
  chartType: "bar" | "line" | "pie";
  chartData: ChartDataItem[];
}

// Define a color palette for pie chart slices
const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary)/0.7)",
  "hsl(var(--secondary)/0.7)",
  "hsl(var(--accent)/0.7)",
];


export default function DynamicChartRenderer({ chartType, chartData }: DynamicChartRendererProps) {
  if (!chartData || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground italic my-2">No data available for the chart.</p>;
  }

  const dataKey = "value";
  const nameKey = "name";

  const chartConfig: ChartConfig = chartData.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: PIE_COLORS[index % PIE_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);
  
  // For bar and line charts, we often define a single series or a few fixed series.
  // For pie charts, each data point is a series, so the config needs to be dynamic.
  if (chartType === "bar" || chartType === "line") {
     chartConfig[dataKey] = {
        label: "Value",
        color: "hsl(var(--chart-1))",
     }
  }


  if (chartType === "bar") {
    return (
      <Card className="my-4 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle>Bar Chart</CardTitle>
          <CardDescription>Visual representation of the data.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full max-w-lg mx-auto">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey={nameKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  if (chartType === "line") {
    return (
      <Card className="my-4 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle>Line Chart</CardTitle>
          <CardDescription>Visual representation of the data showing trends.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full max-w-lg mx-auto">
            <LineChart accessibilityLayer data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey={nameKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={true}
                content={<ChartTooltipContent />} // Show label for line chart points
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={`var(--color-${dataKey})`}
                strokeWidth={2}
                dot={{ r: 4, fill: `var(--color-${dataKey})`, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 1, stroke: "hsl(var(--background))" }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  if (chartType === "pie") {
    return (
      <Card className="my-4 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle>Pie Chart</CardTitle>
          <CardDescription>Distribution of data.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[250px] w-full max-w-md mx-auto aspect-square">
            <PieChart accessibilityLayer>
              <ChartTooltip
                cursor={true}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  return <p className="text-sm text-muted-foreground italic my-2 p-3 border rounded-md bg-muted">Unsupported chart type: {chartType}</p>;
}
