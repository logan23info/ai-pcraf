// js/config.js — Global state and Supabase initialisation
// Loaded first — all other modules depend on these globals

var sb              = null;
var currentUser     = null;
var controls        = [];
var currentEntityId = null;
var checklistState  = Array(10).fill(false);

var CHECKLIST_ITEMS = [
  'Scaffolding: all six scaffold layers addressed?',
  'Codex: every control has a named Codex citation?',
  'Reasoning: every control has a complete CoT reasoning chain?',
  'OOP: every control is a complete CONTROL_OBJECT — no missing fields?',
  'Truth Table: every incident class resolved?',
  'Blind Spots: all affected controls carry their BS-ID?',
  'Shape Up: negative-shape items actively removed?',
  'Dossier: all six fetches attempted and recorded?',
  'Source Truth: every claim carries a source truth status tag?',
  'Fabrication: no FABRICATION-RISK items in client-facing output?'
];

async function initSupabase() {
  try {
    var res = await fetch('/api/config');
    if (!res.ok) throw new Error('Config endpoint returned ' + res.status);
    var cfg = await res.json();
    if (cfg.error) throw new Error(cfg.error);
    sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnon);
    var session = await sb.auth.getSession();
    if (session.data && session.data.session && session.data.session.user) {
      currentUser = session.data.session.user;
      launchApp();
    }
  } catch(e) {
    document.getElementById('auth-err').textContent = 'Configuration error: ' + e.message + '. Check Vercel environment variables.';
  }
}

// Run on page load
initSupabase();
