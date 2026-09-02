// /api/config.js — serves public Supabase config to the browser
// SUPABASE_URL and SUPABASE_ANON_KEY are public by design (Supabase architecture)
// Security is enforced by Row Level Security on all tables — not by keeping the anon key secret
// PCRAF_Key (Groq) remains server-side only and is never returned here

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var supabaseUrl  = process.env.SUPABASE_URL;
  var supabaseAnon = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return res.status(500).json({ error: 'Supabase environment variables not configured on Vercel' });
  }

  // Cache for 1 hour — these values never change
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).json({
    supabaseUrl:  supabaseUrl,
    supabaseAnon: supabaseAnon
  });
}
