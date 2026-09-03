// js/export.js — Export: Excel RCM, JSON backup, session stats
// Depends on: config.js (sb, currentUser, controls), ui.js (showToast)

function updateStats() {
  document.getElementById('stat-controls').textContent   = controls.length;
  document.getElementById('stat-verified').textContent   = controls.filter(function(c){return c.source_status==='V'||c.source_status==='VT';}).length;
  document.getElementById('stat-inferred').textContent   = controls.filter(function(c){return c.source_status==='I';}).length;
  document.getElementById('stat-unverified').textContent = controls.filter(function(c){return c.source_status==='U'||c.source_status==='FR';}).length;
}

function exportJSON() {
  var data = { framework:'AI-PCRAF v2.0', exported:new Date().toISOString(), controls:controls };
  var blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'AI_PCRAF_export_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  showToast('JSON exported');
}

async function exportExcel() {
  var btn      = document.getElementById('excel-btn');
  var statusEl = document.getElementById('excel-status');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  statusEl.textContent = 'Building 4-sheet workbook...';

  try {
    var dossierData = [];
    if (currentUser && sb) {
      var dRes = await sb.from('dossier_log').select('*').eq('user_id', currentUser.id)
        .order('fetched_at', { ascending: false }).limit(60);
      if (!dRes.error) dossierData = dRes.data || [];
    }

    var entityData = {};
    if (currentUser && sb) {
      var eRes = await sb.from('entities').select('*').eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }).limit(1);
      if (!eRes.error && eRes.data && eRes.data.length) entityData = eRes.data[0];
    }

    var fullControls = controls;
    if (currentUser && sb) {
      var cRes = await sb.from('controls').select('*').eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
      if (!cRes.error && cRes.data && cRes.data.length) {
        fullControls = cRes.data.map(function(r) {
          return {
            id: r.control_id, ctrl_domain: r.ctrl_domain, ad_domain: r.ad_domain,
            subsystem: r.subsystem, tier: r.tier, risk_rating: r.risk_rating,
            codex_ref: r.primary_codex_ref, ctrl_type: r.control_type,
            evidence: r.evidence_artifacts, sla: r.reporting_sla,
            source_status: r.source_truth_status === 'VERIFIED-TRAINING' ? 'VT' :
                           r.source_truth_status === 'INFERRED' ? 'I' : 'U',
            created: r.created_at,
            parsed: {
              control_id: r.control_id, control_name: r.control_name,
              assurance_domain: r.ad_domain, subsystem: r.subsystem,
              tier_applicability: [], primary_codex_ref: r.primary_codex_ref,
              secondary_codex_ref: r.secondary_codex_ref, source_truth_status: r.source_truth_status,
              risk_description: r.risk_description, risk_rating: r.risk_rating,
              inherent_risk: r.inherent_risk, residual_risk: r.residual_risk,
              control_type: r.control_type, control_mode: r.control_mode,
              testing_frequency: r.testing_frequency, ai_testing_procedure: r.ai_testing_procedure,
              manual_procedure: r.manual_procedure, evidence_artifacts: r.evidence_artifacts,
              drift_indicator: r.drift_indicator, drift_threshold: r.drift_threshold,
              reportable_to: (r.reportable_to||'').split(',').map(function(s){return s.trim();}),
              reporting_sla: r.reporting_sla, blind_spot_flag: r.blind_spot_flag,
              blind_spot_note: r.blind_spot_note, cot_trigger: r.cot_trigger,
              cot_codex: r.cot_codex, cot_tier: r.cot_tier, cot_design: r.cot_design,
              cot_evidence: r.cot_evidence, cot_failure: r.cot_failure,
              fieldwork_test_steps: r.fieldwork_test_steps, sample_size: r.sample_size,
              evidence_request_list: r.evidence_request_list
            }
          };
        });
      }
    }

    if (!fullControls.length) {
      statusEl.textContent = '';
      showToast('No controls found — generate controls first');
      btn.disabled = false;
      btn.textContent = 'Download RCM (.xlsx)';
      return;
    }

    statusEl.textContent = 'Sending to export engine...';
    var res = await fetch('/api/export-rcm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: entityData, controls: fullControls, dossier: dossierData })
    });

    if (!res.ok) {
      var err = await res.json();
      throw new Error(err.error || 'Export failed');
    }

    var blob = await res.blob();
    var entityName = (entityData.name||'').replace(/[^a-zA-Z0-9]/g,'_').substring(0,20);
    var filename = 'AI_PCRAF_RCM_' + (entityName ? entityName + '_' : '') + new Date().toISOString().slice(0,10) + '.xlsx';
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = fullControls.length + ' controls exported — ' + new Date().toLocaleTimeString('en-IN');
    showToast('RCM Excel downloaded');

  } catch(e) {
    statusEl.textContent = 'Error: ' + e.message;
    showToast('Export failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download RCM (.xlsx)';
  }
}
