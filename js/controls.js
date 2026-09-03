// js/controls.js — Control Matrix: generation, table, DB sync
// Depends on: config.js (sb, currentUser, controls, currentEntityId), api.js (callAPI), ui.js (showToast)

function domainSeq(ctrlDomain) {
  var existing = controls.filter(function(c) { return c.ctrl_domain === ctrlDomain; }).length;
  return existing + 1;
}

async function generateControl() {
  var domain     = document.getElementById('cm-domain').value;
  var ctrlDomain = document.getElementById('cm-ctrl-domain').value;
  var subsystem  = document.getElementById('cm-subsystem').value.trim();
  var tier       = document.getElementById('cm-tier').value;
  var focus      = document.getElementById('cm-focus').value.trim();
  if (!focus) { showToast('Describe the control focus'); return; }

  var seq       = domainSeq(ctrlDomain);
  var controlId = 'CA-' + ctrlDomain + '-' + String(seq).padStart(2,'0');

  document.getElementById('cm-spinner').classList.add('visible');
  document.getElementById('cm-output').classList.remove('visible');

  var entityCtx = (currentEntityId && document.getElementById('ep-name').value)
    ? 'Entity: ' + document.getElementById('ep-name').value + ' (' + document.getElementById('ep-type').value + '). CBS: ' + (document.getElementById('ep-cbs').value || 'unknown') + '.'
    : 'Tier: ' + tier + '.';

  var prompt = 'You are a Principal Cyber Risk & Compliance Consultant under AI-PCRAF v2.0 for Indian BFSI IT Audit.' +
    ' Regulatory scope: RBI IT Gov MD 2023, CERT-In Directions 2022, DPDP Act 2023, NCIIPC, ReBIT, IFTAS.' +
    ' Tag all citations [VT].\n\n' +
    'CONTEXT\n' +
    entityCtx + '\n' +
    'Control ID: ' + controlId + '\n' +
    'Assurance domain: ' + domain + '\n' +
    'Control domain: ' + ctrlDomain + '\n' +
    'Subsystem: ' + (subsystem || 'derive from control focus') + '\n' +
    'Entity tier: ' + tier + '\n' +
    'Control focus: ' + focus + '\n\n' +
    'INSTRUCTION\n' +
    'Return ONLY a raw JSON object. No markdown. No backticks. No explanation before or after.\n' +
    'The JSON must contain exactly these string fields:\n' +
    'control_id, control_name, assurance_domain, subsystem, primary_codex_ref, secondary_codex_ref,' +
    ' source_truth_status, risk_description, risk_rating, inherent_risk, residual_risk,' +
    ' control_type, control_mode, testing_frequency, ai_testing_procedure, manual_procedure,' +
    ' evidence_artifacts, drift_indicator, drift_threshold, reporting_sla,' +
    ' fabrication_flag, blind_spot_note,' +
    ' cot_trigger, cot_codex, cot_tier, cot_design, cot_evidence, cot_failure,' +
    ' fieldwork_test_steps, sample_size, evidence_request_list\n' +
    'And these non-string fields:\n' +
    ' tier_applicability (array of strings), reportable_to (array of strings), blind_spot_flag (boolean)\n\n' +
    'risk_rating must be one of: Critical, High, Medium, Low\n' +
    'control_type must be one of: Preventive, Detective, Corrective\n' +
    'control_mode must be one of: Automated, Manual, Hybrid\n' +
    'source_truth_status must be: VERIFIED-TRAINING\n' +
    'fabrication_flag must be: VT\n' +
    'CITATION RULES (mandatory):\n' +
    '- primary_codex_ref format: DocumentName, Chapter X, Section Y.Z [VT]\n' +
    '- Example: RBI IT Gov MD 2023, Chapter 5, Section 5.3 [VT]\n' +
    '- Example: CERT-In Directions April 2022, Direction 6(a) [VT]\n' +
    '- Always include April 2022 when citing CERT-In Directions\n' +
    '- reportable_to array must use exact tokens: RBI_DAKSH, CERT-In, NCIIPC, DPDP_Board\n' +
    '- Incident reporting SLA is always 6 hours — never 24, 48, or 72 hours\n' +
    '- Never cite GDPR, SOC 2, ISO 27001, or NIST as primary driver\n' +
    'Start your response with { and end with }';

  try {
    var p = null;
    for (var attempt = 1; attempt <= 2; attempt++) {
      var raw = await callAPI(prompt, 2500);
      var firstBrace = raw.indexOf('{');
      var lastBrace  = raw.lastIndexOf('}');
      var clean = (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace)
        ? raw.substring(firstBrace, lastBrace + 1)
        : raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
      try { p = JSON.parse(clean); break; }
      catch(pe) {
        if (attempt === 2) {
          document.getElementById('cm-output').textContent = '[JSON parse error after 2 attempts]\n\n' + raw;
          document.getElementById('cm-output').classList.add('visible');
          return;
        }
        await new Promise(function(r){ setTimeout(r, 800); });
      }
    }

    var lines = [
      'CONTROL_OBJECT  ' + p.control_id,
      '─────────────────────────────────────────────────',
      'Name            ' + p.control_name,
      'Domain          ' + p.assurance_domain,
      'Subsystem       ' + p.subsystem,
      'Tier            ' + (p.tier_applicability||[]).join(', '),
      '',
      'Primary ref     ' + p.primary_codex_ref,
      'Secondary ref   ' + p.secondary_codex_ref,
      'Source truth    [' + p.source_truth_status + ']',
      '',
      'Risk            ' + p.risk_description,
      'Risk rating     ' + p.risk_rating,
      'Inherent risk   ' + p.inherent_risk,
      'Residual risk   ' + p.residual_risk,
      '',
      'Control type    ' + p.control_type,
      'Control mode    ' + p.control_mode,
      'Frequency       ' + p.testing_frequency,
      'AI procedure    ' + p.ai_testing_procedure,
      'Manual proc.    ' + p.manual_procedure,
      '',
      'Evidence        ' + p.evidence_artifacts,
      'Drift indicator ' + p.drift_indicator,
      'Drift threshold ' + p.drift_threshold,
      '',
      'Reportable to   ' + (p.reportable_to||[]).join(', '),
      'Reporting SLA   ' + p.reporting_sla,
      'Blind spot      ' + (p.blind_spot_flag ? p.blind_spot_note : 'None'),
      '',
      'COT REASONING',
      '─────────────────────────────────────────────────',
      p.cot_trigger, p.cot_codex, p.cot_tier, p.cot_design, p.cot_evidence, p.cot_failure,
      '',
      'FIELDWORK PACK  (IIA Standard 2310)',
      '─────────────────────────────────────────────────',
      'Test steps:     ' + p.fieldwork_test_steps,
      'Sample size:    ' + p.sample_size,
      'Evidence req:   ' + p.evidence_request_list
    ];

    var displayText = lines.join('\n');
    document.getElementById('cm-output').textContent = displayText;
    document.getElementById('cm-output').classList.add('visible');

    var dbRow = {
      user_id: currentUser.id, entity_id: currentEntityId || null,
      control_id: p.control_id, ctrl_domain: ctrlDomain, ad_domain: p.assurance_domain,
      subsystem: p.subsystem, tier: tier, focus: focus.substring(0,80),
      control_name: p.control_name, primary_codex_ref: p.primary_codex_ref,
      secondary_codex_ref: p.secondary_codex_ref, source_truth_status: p.source_truth_status,
      risk_description: p.risk_description, risk_rating: p.risk_rating,
      inherent_risk: p.inherent_risk, residual_risk: p.residual_risk,
      control_type: p.control_type, control_mode: p.control_mode,
      testing_frequency: p.testing_frequency, ai_testing_procedure: p.ai_testing_procedure,
      manual_procedure: p.manual_procedure, evidence_artifacts: p.evidence_artifacts,
      drift_indicator: p.drift_indicator, drift_threshold: p.drift_threshold,
      reportable_to: (p.reportable_to||[]).join(', '), reporting_sla: p.reporting_sla,
      fabrication_flag: p.fabrication_flag, blind_spot_flag: p.blind_spot_flag,
      blind_spot_note: p.blind_spot_note, cot_trigger: p.cot_trigger, cot_codex: p.cot_codex,
      cot_tier: p.cot_tier, cot_design: p.cot_design, cot_evidence: p.cot_evidence,
      cot_failure: p.cot_failure, fieldwork_test_steps: p.fieldwork_test_steps,
      sample_size: p.sample_size, evidence_request_list: p.evidence_request_list,
      raw_output: displayText
    };

    var dbRes = await sb.from('controls').insert(dbRow);
    if (dbRes.error) {
      showToast('DB save failed: ' + dbRes.error.message);
      console.error('DB insert error:', dbRes.error);
    } else {
      await loadControlsFromDB();
      showToast(controlId + ' saved — ' + controls.length + ' total controls');
      document.getElementById('cm-focus').value     = '';
      document.getElementById('cm-subsystem').value = '';
      var out = document.getElementById('cm-output');
      out.textContent = out.textContent + '\n\n─────────────────────────────────────────────────\n' +
        controlId + ' saved to Supabase successfully.\n' +
        'To generate the next control:\n' +
        '1. Change domain selectors if needed\n' +
        '2. Enter new subsystem and control focus\n' +
        '3. Click Generate control object';
      var wrap = document.getElementById('control-table-wrap');
      if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch(e) {
    document.getElementById('cm-output').textContent = 'Error: ' + e.message;
    document.getElementById('cm-output').classList.add('visible');
  } finally {
    document.getElementById('cm-spinner').classList.remove('visible');
  }
}

async function loadControlsFromDB() {
  if (!currentUser) return;
  var res = await sb.from('controls').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true });
  if (res.error) { console.error('Load controls error:', res.error); return; }
  controls = (res.data || []).map(function(r) {
    return {
      id:           r.control_id,
      ctrl_domain:  r.ctrl_domain,
      ad_domain:    r.ad_domain,
      subsystem:    r.subsystem,
      tier:         r.tier,
      risk_rating:  r.risk_rating,
      codex_ref:    r.primary_codex_ref,
      ctrl_type:    r.control_type,
      evidence:     r.evidence_artifacts,
      sla:          r.reporting_sla,
      source_status: r.source_truth_status === 'VERIFIED-TRAINING' ? 'VT' :
                     r.source_truth_status === 'INFERRED' ? 'I' : 'U',
      created:      r.created_at
    };
  });
  renderControlTable();
  updateStats();
}

function renderControlTable() {
  var tbody = document.getElementById('control-tbody');
  document.getElementById('control-table-wrap').style.display = controls.length ? 'block' : 'none';
  document.getElementById('ctrl-count').textContent = controls.length;
  tbody.innerHTML = controls.map(function(c, i) {
    return '<tr>' +
      '<td class="mono">' + c.id + '</td>' +
      '<td style="font-size:11px;white-space:nowrap">' + c.ad_domain + '</td>' +
      '<td class="wrap">' + (c.subsystem||'—') + '</td>' +
      '<td><span class="tier-badge" style="font-size:10px">' + c.tier + '</span></td>' +
      '<td class="risk-' + (c.risk_rating||'').toLowerCase() + '">' + (c.risk_rating||'—') + '</td>' +
      '<td class="wrap" style="font-size:11px">' + (c.codex_ref||'—') + '</td>' +
      '<td style="font-size:11px">' + (c.ctrl_type||'—') + '</td>' +
      '<td class="wrap" style="font-size:11px">' + (c.evidence||'—') + '</td>' +
      '<td style="font-size:11px;white-space:nowrap">' + (c.sla||'—') + '</td>' +
      '<td><span class="tag tag-' + (c.source_status||'u').toLowerCase() + '">[' + (c.source_status||'U') + ']</span></td>' +
      '<td><button class="btn btn-danger" style="padding:3px 8px;font-size:11px" onclick="deleteControl(' + i + ')">Remove</button></td>' +
      '</tr>';
  }).join('');
}

async function deleteControl(i) {
  var ctrl = controls[i];
  await sb.from('controls').delete().eq('user_id', currentUser.id).eq('control_id', ctrl.id);
  controls.splice(i, 1);
  renderControlTable();
  showToast('Control removed');
}

async function clearControls() {
  if (!confirm('Clear all controls for this user?')) return;
  await sb.from('controls').delete().eq('user_id', currentUser.id);
  controls = [];
  renderControlTable();
  showToast('Controls cleared');
}
