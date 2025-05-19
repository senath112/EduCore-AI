
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartDataItem {
  name: string; // Corresponds to label (e.g., on X-axis)
  value: number; // Corresponds to the data value (e.g., bar height)
  // Potentially other series if the AI provides more complex data
  [key: string]: any; 
}

interface DynamicChartRendererProps {
  chartType: "bar" | "line" | "pie"; // Extend as needed
  chartData: ChartDataItem[];
}

export default function DynamicChartRenderer({ chartType, chartData }: DynamicChartRendererProps) {
  if (!chartData || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground italic my-2">No data available for the chart.</p>;
  }

  // For now, we'll focus on a simple bar chart where 'value' is the key for data.
  // We can make this more dynamic if the AI starts providing multiple series.
  const dataKey = "value"; 
  const chartConfig: ChartConfig = {
    [dataKey]: {
      label: "Value", // This can be made dynamic if AI provides series names
      color: "hsl(var(--chart-1))",
    },
  };

  if (chartType === "bar") {
    return (
      <Card className="my-4">
        <CardHeader>
          <CardTitle>Chart</CardTitle>
          <CardDescription>Visual representation of the data.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full max-w-lg mx-auto">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                // interval={0} // show all labels
                // angle={-30} // angle labels if too many
                // textAnchor="end" // align angled labels
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={10}
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

  // Placeholder for other chart types
  if (chartType === "line") {
    return <p className="text-sm text-muted-foreground italic my-2">Line chart rendering is not yet implemented.</p>;
  }
  if (chartType === "pie") {
    return <p className="text-sm text-muted-foreground italic my-2">Pie chart rendering is not yet implemented.</p>;
  }

  return <p className="text-sm text-muted-foreground italic my-2">Unsupported chart type: {chartType}</p>;
}
