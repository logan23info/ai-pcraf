// Vercel Serverless Function — /api/generate
// Groq API key stays server-side as PCRAF_Key env variable
// Never exposed to browser

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.PCRAF_Key;
  if (!apiKey) {
    return res.status(500).json({ error: 'PCRAF_Key environment variable not set on Vercel' });
  }

  const { prompt, maxTokens } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  // D-01/D-02 fix: enforce minimum 2500 tokens — full CONTROL_OBJECT + CoT + fieldwork pack
  // requires ~1800-2200 tokens; 2500 gives safe headroom. Frontend hint is advisory only.
  const resolvedTokens = Math.max(maxTokens || 2500, 2500);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: resolvedTokens,
        messages: [
          {
            role: 'system',
            content: 'You are a Principal Cyber Risk and Compliance Consultant under AI-PCRAF v2.0 for Indian BFSI IT Audit. Produce precise audit-ready outputs anchored to RBI IT Gov MD 2023, CERT-In Directions 2022, DPDP Act 2023, NCIIPC, ReBIT, IFTAS. Tag every regulatory citation [VT]. Never fabricate citations.'
          },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok || data.error) {
      const msg = (data.error && data.error.message) ? data.error.message : JSON.stringify(data);
      return res.status(groqRes.status).json({ error: msg });
    }

    const content = (data.choices && data.choices[0] && data.choices[0].message)
      ? data.choices[0].message.content
      : '';

    return res.status(200).json({ content });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
