import { z } from "zod";

// Component schemas for AI-generated UIs
export const catalog = {
  components: {
    LiveScore: z.object({
      homeTeam: z.string(),
      homeScore: z.number(),
      awayTeam: z.string(),
      awayScore: z.number(),
      period: z.string(),
      clock: z.string(),
      state: z.enum(["pre", "in", "post"]),
      yourPick: z.string().optional(),
    }),
    MetricCard: z.object({
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      isPositive: z.boolean().optional(),
      format: z.enum(["currency", "percent", "number"]).optional(),
    }),
    ProgressBar: z.object({
      label: z.string(),
      startValue: z.number(),
      endValue: z.number(),
      currentValue: z.number(),
      isPositive: z.boolean(),
    }),
    Text: z.object({
      content: z.string(),
      variant: z.enum(["body", "caption", "label"]).optional(),
      color: z.enum(["default", "muted", "success", "warning", "danger"]).optional(),
    }),
    ScenarioCard: z.object({
      outcome: z.string(),
      payout: z.number(),
      profit: z.number(),
      roi: z.number(),
      isPositive: z.boolean(),
      probability: z.number().optional(),
    }),
    BarChart: z.object({
      data: z.array(z.object({ name: z.string(), value: z.number() })),
      title: z.string().optional(),
    }),
  },
};

export type CatalogComponents = typeof catalog.components;
export type ComponentName = keyof CatalogComponents;

// Full JSON UI tree schema for AI output
export const uiTreeSchema = z.object({
  components: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("LiveScore"), props: catalog.components.LiveScore }),
      z.object({ type: z.literal("MetricCard"), props: catalog.components.MetricCard }),
      z.object({ type: z.literal("ProgressBar"), props: catalog.components.ProgressBar }),
      z.object({ type: z.literal("Text"), props: catalog.components.Text }),
      z.object({ type: z.literal("ScenarioCard"), props: catalog.components.ScenarioCard }),
      z.object({ type: z.literal("BarChart"), props: catalog.components.BarChart }),
    ]),
  ),
});

export type UiTree = z.infer<typeof uiTreeSchema>;


