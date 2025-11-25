// api/index.js
 
export default async function handler(req, res) {
  // 1. CORS 設定 (允許你的前端網頁 Call 呢個 API)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // 正式版建議換成你的 domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 處理 Preflight Request (瀏覽器安全檢查)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 檢查 API Key 是否存在
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ 錯誤：找不到 GEMINI_API_KEY");
      return res.status(500).json({ error: 'Server Configuration Error: API Key Missing' });
    }

    // 3. 轉發請求給 Google
    // console.log("正在請求 Google Gemini API..."); 
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body), // 直接將前端的 body 傳過去
      }
    );

    const data = await response.json();

    // 4. 檢查 Google 是否回傳錯誤
    if (!response.ok) {
      console.error("❌ Google API Error:", JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    // 5. 成功，回傳資料
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Vercel Function Error:", error);
    return res.status(500).json({ error: error.message });
  }
}