import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { uiTreeSchema } from "@/lib/json-render/catalog";

export const maxDuration = 30;

const MODEL = String(process.env.C9_AI_MODEL || "gpt-4o-mini").trim();

const SYSTEM_PROMPT = `You generate JSON UI trees for a sports betting dashboard. Output ONLY valid JSON, no markdown.

AVAILABLE COMPONENTS:
- LiveScore: { homeTeam, homeScore, awayTeam, awayScore, period, clock, state: "pre"|"in"|"post", yourPick? }
- MetricCard: { label, value, isPositive?, format?: "currency"|"percent"|"number" }
- ProgressBar: { label, startValue, endValue, currentValue, isPositive }
- Text: { content, variant?: "body"|"caption"|"label", color?: "default"|"muted"|"success"|"warning"|"danger" }
- ScenarioCard: { outcome, payout, profit, roi, isPositive, probability? }
- BarChart: { data: [{name, value}], title? }

OUTPUT FORMAT:
{
  "components": [
    { "type": "ComponentName", "props": { ... } },
    ...
  ]
}

RULES:
1. For "Explain this position": Show MetricCard for entry price, MetricCard for current price, ProgressBar showing price movement, Text explaining the position status
2. For "what-if scenarios": Show two ScenarioCards (win/lose outcomes) and a BarChart comparing profit/loss
3. Include LiveScore if live score data is provided
4. All monetary values in USD, prices in cents
5. Calculate actual numbers from the position data provided
6. Be concise but informative in Text content`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { ok: false, error: "missing_openai_api_key" },
      { status: 500 },
    );
  }

  const { prompt, positionData, liveScore } = await req.json();

  const userPrompt = `Position data:
- Ticker: ${positionData.ticker}
- Team: ${positionData.team}
- Match: ${positionData.matchName}
- Entry price: ${positionData.entryPrice}¢
- Current price: ${positionData.currentPrice}¢
- Contracts: ${positionData.contracts}
- Cost: $${positionData.cost.toFixed(2)}
- Unrealized PNL: $${positionData.unrealizedPnl.toFixed(2)} (${positionData.unrealizedPnlPct.toFixed(1)}%)
${liveScore ? `
Live score:
- ${liveScore.home.team}: ${liveScore.home.score}
- ${liveScore.away.team}: ${liveScore.away.score}
- Period: ${liveScore.period}, Clock: ${liveScore.clock}
- State: ${liveScore.state}` : ""}

User request: ${prompt}

Generate JSON UI:`;

  try {
    const { output } = await generateText({
      model: openai(MODEL),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
      output: Output.object({ schema: uiTreeSchema }),
    });

    return Response.json({ ok: true, ...output });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: String(e?.message || e || "generate_failed") },
      { status: 500 },
    );
  }
}


