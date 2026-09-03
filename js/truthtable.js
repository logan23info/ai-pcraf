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

  var prompt = 'AI-PCRAF v2.0 Incident Analysis.\n\n' +
    'Incident: ' + incident + '\nPII: ' + pii + '\nCII: ' + cii + '\nFinancial: ' + financial + '\n\n' +
    'Produce:\n1. Severity classification (Sev-1/2/3)\n' +
    '2. Per-agency reporting obligations with SLA calculations — cite CERT-In Directions April 2022 and RBI IT Gov MD 2023 sections [VT]\n' +
    '3. Immediate response steps (first 2 hours)\n4. Evidence preservation requirements\n' +
    '5. Applicable blind spots (BS-01 to BS-08)\n' +
    '6. De-duplication — single action satisfying multiple agencies\n\nTag citations [VT]. Flag DPDP [BS-01].';

  try {
    var result = await callAPI(prompt, 1000);
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
