import "dotenv/config";
import express from "express";
import cors from "cors"; //middleware to enable cors for browser requests
import OpenAI from "openai";

import reconcileRoutes from "./routes/reconcile.js";
import validateRoutes from "./routes/validate.js";
import { apiKeyAuth, getExpectedApiKey } from "./middleware/apiKeyAuth.js";

const app = express();
app.use(cors()); //enable cors for all routes
app.use(express.json());
app.use("/api", apiKeyAuth);
app.use("/api", reconcileRoutes);
app.use("/api", validateRoutes);

// check if mock mode is enabled
const isMockMode = process.env.USE_MOCK_OPENAI === "true";

if (!process.env.OPENAI_API_KEY && !isMockMode) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

// create openai client
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// check if api key exists, otherwise defaults
if (!process.env.APP_API_KEY) {
  console.warn(
    `APP_API_KEY not set. Using default development key: ${getExpectedApiKey()}`,
  );
}

//Server health check route
app.get("/health", (req, res) => {
  res.json({ status: "server running" });
});

//AI chat route
app.post("/api/chat", async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        error: "Chat endpoint unavailable in mock mode",
      });
    }

    const { message } = req.body; //get the message from the request body

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await client.responses.create({ //create the response from the openai client
      model: "gpt-4.1-mini",
      input: message,
    });

    //return the response to the frontend
    res.json({ 
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI request failed" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
