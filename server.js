import 'dotenv/config';
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting server...");
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.OPENROUTER_API_KEY;

// Middleware - ORDER MATTERS!
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes - THESE MUST COME BEFORE THE WILDCARD ROUTE
app.post("/api/chat", async (req, res) => {
  console.log("Received chat request:", req.body); // Add this for debugging
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "No message provided" });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemma-3-4b-it:free",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    console.log("OpenRouter response:", data); // Add this for debugging
    
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Invalid API response", details: data });
    }
    
    const botReply = data.choices[0].message.content;
    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to get response" });
  }
});

app.post("/api/file", async (req, res) => {
  console.log("Received file request"); // Add this for debugging
  const { message, file } = req.body;

  if (!file) return res.status(400).json({ error: "No file provided" });

  try {
    if (file.type.startsWith('image/')) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "google/gemma-3-4b-it:free",
          messages: [
            { 
              role: "user", 
              content: [
                { type: "text", text: message || "Describe this image" },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type};base64,${file.data}`
                  }
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      console.log("OpenRouter file response:", data); // Add this for debugging
      
      if (!data.choices || !data.choices[0]) {
        return res.status(500).json({ error: "Invalid API response", details: data });
      }
      
      const botReply = data.choices[0].message.content;
      res.json({ reply: botReply });
    } else {
      res.json({ reply: `I received a ${file.type} file. Currently I can only analyze images.` });
    }
  } catch (err) {
    console.error("File error:", err);
    res.status(500).json({ error: "Failed to process file" });
  }
});

// Serve static files (your HTML, CSS, JS)
app.use(express.static(path.join(__dirname, './')));

// Catch-all route for SPA - MUST COME AFTER API ROUTES
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: "API endpoint not found" });
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});