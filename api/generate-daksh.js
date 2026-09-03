// AI-PCRAF M5 — DAKSH Payload Generator
// /api/generate-daksh.js — Vercel Serverless Function
// Generates structured DAKSH incident report payload via Groq
// Returns JSON payload — PDF generation handled by /api/export-daksh.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.PCRAF_Key;
  if (!apiKey) {
    return res.status(500).json({ error: 'PCRAF_Key not configured on Vercel' });
  }

  var body = req.body || {};
  var incident     = body.incident     || '';
  var pii          = body.pii          || 'unknown';
  var cii          = body.cii          || 'unknown';
  var financial    = body.financial    || 'yes';
  var severity     = body.severity     || 'Sev-1';
  var entity       = body.entity       || {};
  var ttResult     = body.ttResult     || {};
  var detectedAt   = body.detectedAt   || new Date().toISOString();
  var incidentRef  = body.incidentRef  || '';

  if (!incident) {
    return res.status(400).json({ error: 'incident description is required' });
  }

  var prompt = 'You are a Principal Cyber Risk and Compliance Consultant under AI-PCRAF v2.0 for Indian BFSI IT Audit.\n\n' +
    'Generate a structured RBI DAKSH incident report payload as a raw JSON object.\n' +
    'No preamble, no markdown, no backticks. Start with { and end with }.\n\n' +
    'INCIDENT CONTEXT\n' +
    'Entity name: ' + (entity.name || 'Not specified') + '\n' +
    'Entity type: ' + (entity.type || 'Not specified') + '\n' +
    'Incident description: ' + incident + '\n' +
    'Severity: ' + severity + '\n' +
    'PII involved: ' + pii + '\n' +
    'CII asset involved: ' + cii + '\n' +
    'Financial system involved: ' + financial + '\n' +
    'Detection timestamp: ' + detectedAt + '\n' +
    'Incident reference: ' + incidentRef + '\n\n' +
    'TRUTH TABLE RESULT\n' +
    'RBI DAKSH: Required — 6 hours SLA\n' +
    'CERT-In: Required — 6 hours SLA\n' +
    'NCIIPC: ' + (cii === 'yes' ? 'Required — Immediate' : cii === 'unknown' ? 'Depends — pending CII confirmation' : 'Not required') + '\n' +
    'DPDP Board: ' + (pii === 'yes' ? 'Required — Immediate' : pii === 'unknown' ? 'Depends — pending PII confirmation' : 'Not required') + '\n\n' +
    'Generate a JSON object with exactly these fields:\n' +
    '{\n' +
    '  "incident_ref": "' + incidentRef + '",\n' +
    '  "report_generated_at": "ISO timestamp",\n' +
    '  "entity_name": "entity name",\n' +
    '  "entity_type": "entity type",\n' +
    '  "rbi_registration_no": "to be filled by entity",\n' +
    '  "cert_in_empanelled": "yes/no/unknown",\n' +
    '  "incident_type": "Ransomware/Data Breach/Unauthorized Access/DDoS/Fraud/Other",\n' +
    '  "incident_description": "clear factual description",\n' +
    '  "severity": "' + severity + '",\n' +
    '  "attack_vector": "External/Internal/Supply Chain/Unknown",\n' +
    '  "detected_at": "' + detectedAt + '",\n' +
    '  "reported_at": "ISO timestamp — within SLA",\n' +
    '  "sla_deadline": "ISO timestamp — 6 hours from detection",\n' +
    '  "systems_affected": "list of affected systems",\n' +
    '  "pii_involved": "' + pii + '",\n' +
    '  "pii_records_affected": "estimated number or unknown",\n' +
    '  "cii_involved": "' + cii + '",\n' +
    '  "financial_system_involved": "' + financial + '",\n' +
    '  "estimated_financial_impact": "amount or unknown",\n' +
    '  "containment_status": "Contained/Ongoing/Under Investigation",\n' +
    '  "containment_actions": "steps taken to contain",\n' +
    '  "root_cause_preliminary": "preliminary root cause assessment",\n' +
    '  "attack_indicators": "IOCs observed — IPs, hashes, signatures",\n' +
    '  "evidence_artifacts": "logs, screenshots, SIEM alerts — list",\n' +
    '  "agencies_notified": ["RBI_DAKSH","CERT-In"],\n' +
    '  "rbi_daksh_sla": "6 hours from detection",\n' +
    '  "cert_in_sla": "6 hours from detection",\n' +
    '  "nciipc_required": "' + (cii === 'yes' ? 'Yes — Immediate' : cii === 'unknown' ? 'Depends' : 'No') + '",\n' +
    '  "dpdp_board_required": "' + (pii === 'yes' ? 'Yes — Immediate' : pii === 'unknown' ? 'Depends' : 'No') + '",\n' +
    '  "escalation_path": "CISO > Board Risk Committee > RBI nodal officer",\n' +
    '  "nodal_officer_name": "to be filled by entity",\n' +
    '  "nodal_officer_contact": "to be filled by entity",\n' +
    '  "bs02_declaration": "DAKSH portal field schema not independently verified [BS-02]. Validate all field names against live DAKSH portal before submission.",\n' +
    '  "bs01_declaration": "' + (pii === 'yes' || pii === 'unknown' ? 'DPDP Rules not yet notified [BS-01] — DPDP Board reporting obligation based on Act interpretation only.' : 'Not applicable') + '",\n' +
    '  "bs04_declaration": "' + (cii === 'yes' || cii === 'unknown' ? 'NCIIPC CII designation not publicly confirmed [BS-04] — presumptive treatment applied.' : 'Not applicable') + '",\n' +
    '  "pre_submission_checklist": {\n' +
    '    "entity_details_verified": false,\n' +
    '    "incident_timeline_accurate": false,\n' +
    '    "systems_affected_complete": false,\n' +
    '    "pii_count_verified": false,\n' +
    '    "containment_status_current": false,\n' +
    '    "evidence_artifacts_listed": false,\n' +
    '    "nodal_officer_details_filled": false,\n' +
    '    "bs02_schema_validated": false\n' +
    '  },\n' +
    '  "source_truth_status": "INFERRED",\n' +
    '  "fabrication_flag": "I"\n' +
    '}';

  try {
    var groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: 'You are a structured output generator. Return ONLY valid JSON. No markdown, no backticks, no preamble.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    var data = await groqRes.json();
    if (!groqRes.ok || data.error) {
      var msg = data.error && data.error.message ? data.error.message : JSON.stringify(data);
      return res.status(groqRes.status).json({ error: msg });
    }

    var raw = (data.choices && data.choices[0] && data.choices[0].message)
      ? data.choices[0].message.content : '';

    // Extract JSON
    var firstBrace = raw.indexOf('{');
    var lastBrace  = raw.lastIndexOf('}');
    var clean = (firstBrace !== -1 && lastBrace > firstBrace)
      ? raw.substring(firstBrace, lastBrace + 1) : raw;

    var parsed;
    try { parsed = JSON.parse(clean); }
    catch(e) { return res.status(200).json({ raw: raw, parse_error: e.message }); }

    return res.status(200).json({ payload: parsed });

  } catch(err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
