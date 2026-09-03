// js/daksh.js — DAKSH Incident Payload Generator (M5)
// Depends on: config.js (sb, currentUser, currentEntityId), ui.js (showToast)

var dakshPayload = null;

function generateIncidentRef() {
  var now = new Date();
  var pad = function(n) { return String(n).padStart(2,'0'); };
  return 'PCRAF-' + now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) +
    '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
}

async function generateDakshPayload() {
  var incident  = document.getElementById('dk-incident').value.trim();
  var pii       = document.getElementById('dk-pii').value;
  var cii       = document.getElementById('dk-cii').value;
  var financial = document.getElementById('dk-financial').value;
  var severity  = document.getElementById('dk-severity').value;
  var detectedAt= document.getElementById('dk-detected').value;

  if (!incident) { showToast('Describe the incident'); return; }
  if (!detectedAt) { showToast('Enter detection date/time'); return; }

  var btn = document.getElementById('dk-generate-btn');
  btn.disabled = true;
  document.getElementById('dk-spinner').classList.add('visible');
  document.getElementById('dk-output-wrap').style.display = 'none';

  var incidentRef = generateIncidentRef();
  document.getElementById('dk-ref-display').textContent = incidentRef;

  // Load entity context from Supabase
  var entityData = {};
  if (currentUser && sb) {
    var eRes = await sb.from('entities').select('*').eq('user_id', currentUser.id)
      .order('created_at', { ascending: false }).limit(1);
    if (!eRes.error && eRes.data && eRes.data.length) entityData = eRes.data[0];
  }

  try {
    var res = await fetch('/api/generate-daksh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident: incident, pii: pii, cii: cii,
        financial: financial, severity: severity,
        detectedAt: detectedAt, incidentRef: incidentRef,
        entity: entityData
      })
    });

    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');

    if (data.parse_error) {
      document.getElementById('dk-raw-output').textContent = '[Parse error — raw output:]\n\n' + data.raw;
      document.getElementById('dk-raw-output').style.display = 'block';
      document.getElementById('dk-output-wrap').style.display = 'block';
      return;
    }

    dakshPayload = data.payload;
    renderDakshPayload(dakshPayload);

    // Save to Supabase
    if (currentUser) {
      await sb.from('daksh_payloads').insert({
        user_id:              currentUser.id,
        entity_id:            currentEntityId || null,
        incident_ref:         incidentRef,
        incident_description: incident,
        severity:             severity,
        incident_type:        dakshPayload.incident_type || '',
        payload_json:         dakshPayload
      });
    }
    showToast('Payload generated — ' + incidentRef);

  } catch(e) {
    document.getElementById('dk-raw-output').textContent = 'Error: ' + e.message;
    document.getElementById('dk-raw-output').style.display = 'block';
    document.getElementById('dk-output-wrap').style.display = 'block';
  } finally {
    document.getElementById('dk-spinner').classList.remove('visible');
    btn.disabled = false;
  }
}

function renderDakshPayload(p) {
  var wrap = document.getElementById('dk-output-wrap');
  var raw  = document.getElementById('dk-raw-output');
  raw.style.display = 'none';

  // BS-02 warning
  document.getElementById('dk-bs02-warning').textContent = p.bs02_declaration || '';

  // Populate all display fields
  var fields = [
    ['dk-f-ref',         p.incident_ref],
    ['dk-f-entity',      p.entity_name + ' (' + p.entity_type + ')'],
    ['dk-f-rbi-reg',     p.rbi_registration_no],
    ['dk-f-certin',      p.cert_in_empanelled],
    ['dk-f-type',        p.incident_type],
    ['dk-f-severity',    p.severity],
    ['dk-f-vector',      p.attack_vector],
    ['dk-f-desc',        p.incident_description],
    ['dk-f-detected',    p.detected_at],
    ['dk-f-reported',    p.reported_at],
    ['dk-f-sla-deadline',p.sla_deadline],
    ['dk-f-systems',     p.systems_affected],
    ['dk-f-pii',         p.pii_involved],
    ['dk-f-pii-count',   p.pii_records_affected],
    ['dk-f-cii',         p.cii_involved],
    ['dk-f-financial',   p.financial_system_involved],
    ['dk-f-fin-impact',  p.estimated_financial_impact],
    ['dk-f-rbi-sla',     p.rbi_daksh_sla],
    ['dk-f-certin-sla',  p.cert_in_sla],
    ['dk-f-nciipc',      p.nciipc_required],
    ['dk-f-dpdp',        p.dpdp_board_required],
    ['dk-f-containment', p.containment_status],
    ['dk-f-actions',     p.containment_actions],
    ['dk-f-rootcause',   p.root_cause_preliminary],
    ['dk-f-iocs',        p.attack_indicators],
    ['dk-f-evidence',    p.evidence_artifacts],
    ['dk-f-escalation',  p.escalation_path],
    ['dk-f-nodal',       p.nodal_officer_name],
    ['dk-f-nodal-contact',p.nodal_officer_contact]
  ];

  fields.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.textContent = pair[1] || '—';
  });

  // Checklist
  if (p.pre_submission_checklist) {
    var cl = document.getElementById('dk-checklist-items');
    cl.innerHTML = Object.keys(p.pre_submission_checklist).map(function(key) {
      var label = key.replace(/_/g,' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
      return '<div class="checklist-item">' +
        '<input type="checkbox" id="dkc-' + key + '" onchange="toggleDakshCheck(\'' + key + '\')">' +
        '<label for="dkc-' + key + '">' + label + '</label></div>';
    }).join('');
  }

  // BS declarations
  var bsBox = document.getElementById('dk-bs-declarations');
  var bsItems = [p.bs01_declaration, p.bs04_declaration].filter(function(d){ return d && d !== 'Not applicable'; });
  bsBox.innerHTML = bsItems.length
    ? bsItems.map(function(d){ return '<div style="margin-bottom:6px">&#9888; ' + d + '</div>'; }).join('')
    : '<div style="color:var(--tag-v)">No additional blind spot declarations for this incident.</div>';

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleDakshCheck(key) {
  if (dakshPayload && dakshPayload.pre_submission_checklist) {
    dakshPayload.pre_submission_checklist[key] = !dakshPayload.pre_submission_checklist[key];
  }
}

async function exportDakshPDF() {
  if (!dakshPayload) { showToast('Generate a payload first'); return; }
  var btn = document.getElementById('dk-pdf-btn');
  btn.disabled = true;
  btn.textContent = 'Generating PDF...';

  try {
    var res = await fetch('/api/export-daksh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: dakshPayload })
    });
    if (!res.ok) {
      var err = await res.json();
      throw new Error(err.error || 'PDF generation failed');
    }
    var blob = await res.blob();
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'DAKSH_Incident_' + (dakshPayload.incident_ref || 'draft') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
    a.click();
    URL.revokeObjectURL(url);

    // Mark as PDF generated in Supabase
    if (currentUser && dakshPayload.incident_ref) {
      await sb.from('daksh_payloads')
        .update({ pdf_generated: true })
        .eq('user_id', currentUser.id)
        .eq('incident_ref', dakshPayload.incident_ref);
    }
    showToast('DAKSH PDF downloaded');
  } catch(e) {
    showToast('PDF error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download PDF';
  }
}

async function loadDakshHistory() {
  if (!currentUser) return;
  var res = await sb.from('daksh_payloads').select('*').eq('user_id', currentUser.id)
    .order('created_at', { ascending: false }).limit(20);
  if (res.error || !res.data || !res.data.length) {
    document.getElementById('dk-history-tbody').innerHTML =
      '<tr><td colspan="5" style="color:var(--text-muted);font-size:12px">No payloads generated yet</td></tr>';
    return;
  }
  document.getElementById('dk-history-tbody').innerHTML = res.data.map(function(r) {
    return '<tr>' +
      '<td class="mono">' + r.incident_ref + '</td>' +
      '<td class="wrap" style="font-size:11px">' + (r.incident_description||'—').substring(0,60) + '</td>' +
      '<td>' + (r.severity||'—') + '</td>' +
      '<td>' + (r.pdf_generated ? '<span class="tag tag-v">[PDF]</span>' : '<span class="tag tag-u">[Pending]</span>') + '</td>' +
      '<td style="font-size:11px;white-space:nowrap">' + new Date(r.created_at).toLocaleString('en-IN') + '</td>' +
      '<td><button class="btn btn-secondary" style="padding:3px 8px;font-size:11px" onclick="reloadPayload(\'' + r.incident_ref + '\')">View</button></td>' +
      '</tr>';
  }).join('');
  showToast('History loaded — ' + res.data.length + ' payloads');
}

async function reloadPayload(ref) {
  if (!currentUser) return;
  var res = await sb.from('daksh_payloads').select('*').eq('user_id', currentUser.id).eq('incident_ref', ref).limit(1);
  if (res.error || !res.data || !res.data.length) { showToast('Payload not found'); return; }
  dakshPayload = res.data[0].payload_json;
  renderDakshPayload(dakshPayload);
  showToast('Payload loaded — ' + ref);
}
