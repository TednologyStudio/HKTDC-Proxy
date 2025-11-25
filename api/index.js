// 檔案路徑: api/index.js

// 告訴 Vercel 使用 Edge Runtime (速度快，適合 Proxy)
export const config = {
    runtime: 'edge',
  };
  
  export default async function handler(request) {
    // 1. 處理 CORS (允許任何網站 Call 這個 API)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
  
    // 只允許 POST 請求
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
  
    try {
      // 2. 讀取 Vercel 設定的環境變數
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server API Key Config Error' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      // 3. 取得前端傳來的 Body
      const requestBody = await request.json();
  
      // 4. 轉發給 Google Gemini
      // 這裡用 gemini-1.5-flash，你也可以改用 gemini-2.0-flash-exp
      const googleResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
  
      const data = await googleResp.json();
  
      // 5. 回傳結果給前端
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
  
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }