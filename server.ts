import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Resolve possible localhost lookup issue inside Docker container environments
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Check if credentials are set
  app.get("/api/telegram-config", (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const configured = !!(
      token && 
      chatId && 
      token.trim() !== "" && 
      chatId.trim() !== "" &&
      token !== "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" && 
      chatId !== "-100123456789"
    );
    res.json({ configured });
  });

  // Trigger notification to Telegram bot
  app.post("/api/telegram-notify", async (req, res) => {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!token || !chatId || token === "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" || chatId === "-100123456789") {
        return res.status(400).json({ error: "សូមរៀបចំបំពេញតំលៃ TELEGRAM_BOT_TOKEN និង TELEGRAM_CHAT_ID នៅក្នុង Settings / Secrets ជាមុនសិន។" });
      }

      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "No text message provided" });
      }

      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorData.description || "Failed sending notification to Telegram" 
        });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Telegram endpoint error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Serve Frontend / Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://localhost:${PORT}`);
  });
}

startServer();
