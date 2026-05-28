export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const { messages, max_tokens } = req.body;
    const prompt = messages.map(m =>
      typeof m.content === "string" ? m.content : m.content.map(c => c.text || "").join("")
    ).join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: max_tokens || 2000 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Return in Anthropic-compatible format so App.jsx doesn't need changes
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
