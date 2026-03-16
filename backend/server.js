import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

import reconcileRoutes from "./routes/reconcile.js";
import validateRoutes from "./routes/validate.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", reconcileRoutes);
app.use("/api", validateRoutes);

const isMockMode = process.env.USE_MOCK_OPENAI === "true";

if (!process.env.OPENAI_API_KEY && !isMockMode) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

//Health check route
app.get("/health", (req, res) => {
  res.json({ status: "server running" });
});

//AI route
app.post("/api/chat", async (req, res) => {
    try{
        if (!client) {
          return res.status(503).json({
            error: "Chat endpoint unavailable in mock mode",
          });
        }

        const { message } = req.body;

        if (!message) {
          return res.status(400).json({ error: "Message is required" });
        }

        const response = await client.responses.create({
            model: "gpt-4.1-mini",
            input: message
        });

        res.json({
            reply: response.output_text
        });
    }
    catch(error){
        console.error(error);
        res.status(500).json({ error: "AI request failed" });
    }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});