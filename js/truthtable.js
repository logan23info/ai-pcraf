// js/truthtable.js — Truth Table: incident classification and multi-agency SLA resolution
// Depends on: config.js (sb, currentUser, currentEntityId), api.js (callAPI), ui.js (showToast)

async function runTruthTable() {
  var incident  = document.getElementById('tt-incident').value.trim();
  var pii       = document.getElementById('tt-pii').value;
  var cii       = document.getElementById('tt-cii').value;
  var financial = document.getElementById('tt-financial').value;
  if (!incident) { showToast('Describe the incident'); return; }

  var ttRows = [
    { agency:'RBI DAKSH', reqClass:'tt-cell-yes', reqLabel:'&#10003; Required',
      sla:'6 hours from detection', slaColor:'var(--risk-critical)', start:'Time of detection',
      portal:'DAKSH portal [BS-02: validate field schema before submission]' },
    { agency:'CERT-In', reqClass:'tt-cell-yes', reqLabel:'&#10003; Required',
      sla:'6 hours from detection', slaColor:'var(--risk-critical)', start:'Time of detection',
      portal:'cert-in.org.in — incident reporting form' },
    { agency:'NCIIPC',
      reqClass: cii==='yes' ? 'tt-cell-yes' : cii==='unknown' ? 'tt-cell-dep' : 'tt-cell-no',
      reqLabel: cii==='yes' ? '&#10003; Required' : cii==='unknown' ? 'Depends — confirm CII status' : '&#10007; Not required',
      sla:      cii==='yes' ? 'Immediate' : cii==='unknown' ? 'Pending CII confirmation' : '—',
      slaColor: cii==='no' ? 'var(--text-muted)' : 'var(--risk-critical)',
      start:    cii!=='no' ? 'Time of detection' : '—',
      portal:   'nciipc.gov.in [BS-04: SCB and NBFC-UL/TL presumptive CII]' },
    { agency:'DPDP Board',
      reqClass: pii==='yes' ? 'tt-cell-yes' : pii==='unknown' ? 'tt-cell-dep' : 'tt-cell-no',
      reqLabel: pii==='yes' ? '&#10003; Required' : pii==='unknown' ? 'Depends — confirm PII exposure' : '&#10007; Not required',
      sla:      pii==='yes' ? 'Immediate' : pii==='unknown' ? 'Pending PII confirmation' : '—',
      slaColor: pii==='no' ? 'var(--text-muted)' : 'var(--risk-critical)',
      start:    pii!=='no' ? 'Time of breach discovery' : '—',
      portal:   'MeitY/DPDP Board [BS-01: Rules not notified — schema unknown]' }
  ];

  document.getElementById('tt-tbody').innerHTML = ttRows.map(function(row) {
    return '<tr><td style="font-weight:600">' + row.agency + '</td>' +
      '<td class="' + row.reqClass + '">' + row.reqLabel + '</td>' +
      '<td style="font-weight:600;color:' + row.slaColor + '">' + row.sla + '</td>' +
      '<td style="font-size:12px">' + row.start + '</td>' +
      '<td class="wrap" style="font-size:11px">' + row.portal + '</td></tr>';
  }).join('');

  var hasDeps = pii==='unknown' || cii==='unknown';
  var govSLA  = (pii==='yes'||cii==='yes') ? 'Immediate' : hasDeps ? 'Immediate (worst-case — confirm dependencies)' : '6 hours';
  document.getElementById('tt-hcd').textContent = 'Governing SLA (HCD rule): ' + govSLA + ' — all teams work to this clock.';
  document.getElementById('tt-depends-note').style.display = hasDeps ? 'block' : 'none';
  document.getElementById('tt-result').style.display = 'block';

  document.getElementById('tt-spinner').classList.add('visible');
  document.getElementById('tt-output').classList.remove('visible');

  var prompt = 'You are a Principal Cyber Risk & Compliance Consultant under AI-PCRAF v2.0 for Indian BFSI IT Audit.\n\n' +
    'INCIDENT CONTEXT\n' +
    'Description: ' + incident + '\n' +
    'PII involved: ' + pii + '\n' +
    'CII asset involved: ' + cii + '\n' +
    'Financial system involved: ' + financial + '\n\n' +
    'Produce a complete incident analysis with all 6 sections fully developed:\n\n' +
    '1. SEVERITY CLASSIFICATION\n' +
    '   - Classify as Sev-1 (critical — CBS/payment down), Sev-2 (significant), or Sev-3 (limited)\n' +
    '   - State justification for the classification\n\n' +
    '2. REGULATORY REPORTING OBLIGATIONS & SLA\n' +
    '   - RBI DAKSH: always required — SLA is 6 hours from time of detection — cite RBI IT Gov MD 2023, Chapter/Section [VT]\n' +
    '   - CERT-In: always required — SLA is 6 hours from time of detection — cite CERT-In Directions April 2022, Direction number [VT]\n' +
    '   - NCIIPC: required if CII=yes or unknown — state Immediate SLA — cite NCIIPC guidelines [VT]\n' +
    '   - DPDP Board: required if PII=yes — Immediate SLA — flag [BS-01] — cite DPDP Act 2023, Section [VT]\n' +
    '   - For each agency: state exact SLA clock start, deadline, and reporting portal\n' +
    '   - Incident reporting SLA is always 6 hours — never state 24 hours, 48 hours, or 72 hours\n\n' +
    '3. IMMEDIATE RESPONSE STEPS (first 2 hours)\n' +
    '   - Minimum 5 numbered steps in chronological order\n\n' +
    '4. EVIDENCE PRESERVATION\n' +
    '   - Specific artifacts to preserve: logs, SIEM alerts, network captures, access records\n' +
    '   - Chain of custody requirement\n\n' +
    '5. APPLICABLE BLIND SPOTS\n' +
    '   - State which of BS-01 to BS-08 apply to this incident and why\n\n' +
    '6. DE-DUPLICATION\n' +
    '   - Where reporting obligations overlap, identify the single action that satisfies multiple agencies\n\n' +
    'CITATION RULES (mandatory)\n' +
    '- Every citation: document name + Chapter/Section number + [VT]\n' +
    '- CERT-In Directions April 2022 — always include April 2022\n' +
    '- Flag DPDP items [BS-01]\n' +
    '- Do not reference GDPR, SOC 2, ISO 27001, or NIST';

  try {
    var result = await callAPI(prompt, 1800);
    document.getElementById('tt-output').textContent = result;
    document.getElementById('tt-output').classList.add('visible');
    if (currentUser) {
      await sb.from('incidents').insert({
        user_id: currentUser.id, entity_id: currentEntityId||null,
        description: incident, pii: pii, cii: cii, financial: financial,
        ai_analysis: result
      });
    }
  } catch(e) {
    document.getElementById('tt-output').textContent = 'Error: ' + e.message;
    document.getElementById('tt-output').classList.add('visible');
  } finally {
    document.getElementById('tt-spinner').classList.remove('visible');
  }
}

function resetTT() {
  document.getElementById('tt-result').style.display   = 'none';
  document.getElementById('tt-output').classList.remove('visible');
  document.getElementById('tt-output').textContent     = '';
  document.getElementById('tt-incident').value         = '';
}
