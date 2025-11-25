export default async function handler(req, res) {
  // ---------------- CORS ----------------
  const allowedOrigins = [
    "https://redirectfilter.com",
    "https://www.redirectfilter.com",
  ];

  const origin = req.headers.origin || "";

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // ---------------- 拿前端 JSON ----------------
    const { imageBase64, style } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }
    if (!style) {
      return res.status(400).json({ error: "Missing style" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set" });
    }

    // ---------------- Build Prompt ----------------
    let outfitDesc = "";
    let role = "";

    if (style === "construction") {
      outfitDesc = "wearing a yellow safety helmet and high-visibility reflective construction vest";
      role = "construction worker";
    } else if (style === "lawyer") {
      outfitDesc = "wearing a traditional white barrister wig and formal black lawyer gown";
      role = "barrister";
    } else if (style === "firefighter") {
      outfitDesc = "wearing a firefighter uniform and a safety helmet";
      role = "firefighter";
    } else if (style === "graduate") {
      outfitDesc = "wearing a graduation gown and a mortarboard cap";
      role = "university graduate";
    }

    const prompt = `Analyze the uploaded image to understand the all people gender, approximate age, and facial features.

Then, generate a high-quality, photorealistic portrait of all people with those SAME physical attributes, posing as a ${role}, ${outfitDesc}.

all people are facing the camera making a heart shape with hands.
The background should be a professional blurred environment suitable for a ${role}.
Ensure the face is clearly visible and realistic. Do not produce a cartoon.`;

    // ---------------- Gemini Payload（⚠️只有必要 fields） ----------------
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "9:16",
          imageSize: "1K",
        },
      },
    };

    // ---------------- Call Gemini ----------------
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ❗❗ 只送 payload — 無 imageBase64/style/name 在頂層
        body: JSON.stringify(payload),
      }
    );

    const data = await resp.json();

    // Google Error Pass-through
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data });
    }

    // Extract image
    const parts = data.candidates?.[0]?.content?.parts;
    const img = parts?.find((p) => p.inlineData);

    if (!img) {
      return res.status(500).json({ error: "Gemini returned no image" });
    }

    const output = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;

    return res.status(200).json({ ok: true, imageDataUrl: output });

  } catch (err) {
    return res.status(500).json({
      error: "Proxy Error",
      message: err.message || String(err),
    });
  }
}
