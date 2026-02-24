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

// Check if API key is set
if (!API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY is not set in .env file!");
  process.exit(1);
}

console.log("API Key (first 10 chars):", API_KEY.substring(0, 10) + "...");

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.post("/api/chat", async (req, res) => {
  console.log("Received chat request:", req.body);
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  try {
    console.log("Sending request to OpenRouter...");
    
    // OpenRouter requires these headers
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "HTTP-Referer": req.headers.origin || "http://localhost:3000",
        "X-Title": "AI Chatbot"
      },
      body: JSON.stringify({
        model: "google/gemma-3-4b-it:free",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    console.log("OpenRouter response status:", response.status);
    
    if (!response.ok) {
      console.error("OpenRouter error details:", data);
      return res.status(response.status).json({ 
        error: "OpenRouter API error", 
        details: data.error || data,
        status: response.status
      });
    }
    
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ 
        error: "Invalid API response", 
        details: "No choices in response" 
      });
    }
    
    const botReply = data.choices[0].message.content;
    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ 
      error: "Failed to get response", 
      details: err.message 
    });
  }
});

app.post("/api/file", async (req, res) => {
  const { message, file } = req.body;

  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  try {
    if (file.type.startsWith('image/')) {
      console.log("Processing image file...");
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
          "HTTP-Referer": req.headers.origin || "http://localhost:3000",
          "X-Title": "AI Chatbot"
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
      console.log("OpenRouter file response status:", response.status);
      
      if (!response.ok) {
        console.error("OpenRouter file error:", data);
        return res.status(response.status).json({ 
          error: "OpenRouter API error", 
          details: data.error || data 
        });
      }
      
      if (!data.choices || !data.choices[0]) {
        return res.status(500).json({ 
          error: "Invalid API response", 
          details: "No choices in response" 
        });
      }
      
      const botReply = data.choices[0].message.content;
      res.json({ reply: botReply });
    } else {
      res.json({ reply: `I received a ${file.type} file. Currently I can only analyze images.` });
    }
  } catch (err) {
    console.error("File error:", err);
    res.status(500).json({ 
      error: "Failed to process file", 
      details: err.message 
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Catch-all route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Key status: ${API_KEY ? 'Set' : 'NOT SET'}`);
  console.log(`API Key length: ${API_KEY ? API_KEY.length : 0} characters`);
});