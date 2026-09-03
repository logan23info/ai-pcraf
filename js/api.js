// js/api.js — Groq API call wrapper via Vercel serverless function
// Depends on: nothing (self-contained)

async function callAPI(prompt, maxTokens) {
  maxTokens = maxTokens || 1200;
  var res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, maxTokens: maxTokens })
  });
  var data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Server error');
  return data.content || '';
}
