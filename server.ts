import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface TradeoffCandidate {
  id: string;
  name: string;
  societyName: string;
  locality: string;
  bhk: string;
  baseRent: number;
  maintenanceCharges: number;
  trueMonthlyCost: number;
  monthlyCommuteCost: number;
  peakCommuteMinutes: number;
  monthlyTrafficHours: number;
  waterReliability: string;
  smartMatchScore: number;
  cheaperAlternative?: {
    name: string;
    locality: string;
    baseRent: number;
    trueMonthlyCost: number;
    monthlyCommuteCost: number;
    monthlyTrafficHours: number;
  };
}

interface TradeoffRequestBody {
  officeHubName: string;
  commuteMode: string;
  maxBudget: number;
  topProperties: TradeoffCandidate[];
}

interface AdvisorRequestBody {
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context: {
    officeHubName: string;
    commuteMode: string;
    maxBudget: number;
    bhkFilter: string;
    localityFilter: string;
    weights: { cost: number; commute: number; amenities: number };
    propertiesSummary: Array<{
      name: string;
      societyName: string;
      locality: string;
      bhk: string;
      baseRent: number;
      maintenanceCharges: number;
      securityDeposit: number;
      trueMonthlyCost: number;
      monthlyCommuteCost: number;
      peakCommuteMinutes: number;
      monthlyTrafficHours: number;
      waterReliability: string;
      metroKm: number;
      smartMatchScore: number;
    }>;
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/ai/tradeoffs", async (req: Request, res: Response) => {
    const body = req.body as TradeoffRequestBody;
    if (!body || !Array.isArray(body.topProperties) || body.topProperties.length === 0) {
      res.status(400).json({ error: "topProperties array is required" });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "Gemini API key is not configured in Settings > Secrets.",
        code: "API_KEY_MISSING",
      });
      return;
    }

    try {
      const prompt = `You are NammaRent Intel's Bengaluru real-estate financial analyst.
User Context:
- Target Office Hub: ${body.officeHubName}
- Commute Mode: ${body.commuteMode}
- Max True Monthly Cost Budget: ₹${body.maxBudget.toLocaleString("en-IN")}

Top 3 SmartMatch Properties & Cheaper Alternatives:
${JSON.stringify(body.topProperties, null, 2)}

Task:
For each of the top 3 properties, write a crisp, data-backed 2-sentence explanation of why it outperforms cheaper base-rent alternatives.
Rules:
1. Reference exact INR (₹) numbers (commute savings, maintenance/tanker buffer, or TMCL delta) and exact monthly traffic hours saved from the provided JSON.
2. Keep each explanation strictly to 2 concise sentences. No bullet points, no markdown bolding, plain editorial prose.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                propertyId: {
                  type: Type.STRING,
                  description: "The exact id of the property from topProperties.",
                },
                explanation: {
                  type: Type.STRING,
                  description: "Exactly 2 sentences explaining the financial and traffic trade-off with ₹ figures and hours saved.",
                },
              },
              required: ["propertyId", "explanation"],
            },
          },
        },
      });

      const rawText = (response.text ?? "[]").trim();
      const parsed = JSON.parse(rawText) as Array<{ propertyId: string; explanation: string }>;
      res.json({ explanations: parsed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate trade-off insights";
      console.error("Tradeoff Gemini API error:", message);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/advisor", async (req: Request, res: Response) => {
    const body = req.body as AdvisorRequestBody;
    if (!body || !body.question || typeof body.question !== "string") {
      res.status(400).json({ error: "question is required" });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "Gemini API key is not configured in Settings > Secrets.",
        code: "API_KEY_MISSING",
      });
      return;
    }

    try {
      const systemInstruction = `You are the NammaRent Intel Advisor, a hyper-local Bengaluru rental and commute financial strategist.
Always ground every recommendation strictly in the live property metrics and user context provided below.
Format all currency values in Indian Rupees (e.g. ₹38,500). Cite exact property names, societies, TMCL (True Monthly Cost of Living), peak commute minutes, monthly traffic hours, deposit amounts, and water reliability ("High", "Moderate", "Tanker Dependent").
Keep responses well-structured, concise (3–5 short paragraphs or clean bullets), and actionable.`;

      const historyText = (body.history ?? [])
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "Advisor"}: ${m.content}`)
        .join("\n");

      const prompt = `Live Portfolio & User Filter State:
- Target Office Hub: ${body.context.officeHubName}
- Commute Mode: ${body.context.commuteMode}
- Max TMCL Budget: ₹${body.context.maxBudget.toLocaleString("en-IN")}
- BHK Filter: ${body.context.bhkFilter}
- Locality Filter: ${body.context.localityFilter}
- Priority Weights (Cost/Commute/Amenities): ${body.context.weights.cost}/${body.context.weights.commute}/${body.context.weights.amenities}

Live Computed Properties (sorted by SmartMatch Score):
${JSON.stringify(body.context.propertiesSummary, null, 2)}

${historyText ? `Recent Conversation:\n${historyText}\n` : ""}
User Question: ${body.question}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({ reply: response.text ?? "Unable to formulate a recommendation right now." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to query NammaRent AI Advisor";
      console.error("Advisor Gemini API error:", message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NammaRent Intel server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
