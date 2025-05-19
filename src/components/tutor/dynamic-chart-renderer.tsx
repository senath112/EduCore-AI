
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartDataItem {
  name: string; // Corresponds to label (e.g., on X-axis)
  value: number; // Corresponds to the data value (e.g., bar height, line point)
  [key: string]: any; 
}

interface DynamicChartRendererProps {
  chartType: "bar" | "line" | "pie";
  chartData: ChartDataItem[];
}

export default function DynamicChartRenderer({ chartType, chartData }: DynamicChartRendererProps) {
  if (!chartData || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground italic my-2">No data available for the chart.</p>;
  }

  const dataKey = "value"; 
  const chartConfig: ChartConfig = {
    [dataKey]: {
      label: "Value", 
      color: "hsl(var(--chart-1))",
    },
  };

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
                dataKey="name"
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
                dataKey="name"
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
                content={<ChartTooltipContent hideLabel />}
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
    return <p className="text-sm text-muted-foreground italic my-2 p-3 border rounded-md bg-muted">Pie chart rendering is not yet implemented. The AI might provide data for it if you ask!</p>;
  }

  return <p className="text-sm text-muted-foreground italic my-2 p-3 border rounded-md bg-muted">Unsupported chart type: {chartType}</p>;
}

