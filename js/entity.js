// js/entity.js — Entity Profiler tab
// Depends on: config.js (sb, currentUser, currentEntityId), api.js (callAPI), ui.js (showToast)

async function generateEntityProfile() {
  var name   = document.getElementById('ep-name').value.trim();
  var type   = document.getElementById('ep-type').value;
  var cbs    = document.getElementById('ep-cbs').value.trim();
  var cloud  = document.getElementById('ep-cloud').value;
  var assets = document.getElementById('ep-assets').value.trim();
  var period = document.getElementById('ep-period').value.trim();
  var risks  = document.getElementById('ep-risks').value.trim();
  if (!name || !type) { showToast('Enter entity name and type'); return; }

  document.getElementById('ep-spinner').classList.add('visible');
  document.getElementById('ep-output').classList.remove('visible');
  document.getElementById('ep-generate-btn').disabled = true;

  // Derive tier label explicitly for NBFC entities — prevents generic Tier-N output (D-03)
  var tierLabel = type;
  if (type === 'NBFC-BL') tierLabel = 'NBFC-BL (Base Layer — Scale-Based Regulation)';
  if (type === 'NBFC-ML') tierLabel = 'NBFC-ML (Middle Layer — Scale-Based Regulation)';
  if (type === 'NBFC-UL') tierLabel = 'NBFC-UL (Upper Layer — Scale-Based Regulation)';
  if (type === 'NBFC-TL') tierLabel = 'NBFC-TL (Top Layer — Scale-Based Regulation)';

  var prompt = 'You are a Principal Cyber Risk & Compliance Consultant under AI-PCRAF v2.0 for Indian BFSI IT Audit.\n\n' +
    'ENTITY CONTEXT\n' +
    'Name: ' + name + '\n' +
    'Regulatory classification: ' + tierLabel + '\n' +
    'Core banking system: ' + (cbs||'Unknown') + '\n' +
    'Cloud footprint: ' + cloud + '\n' +
    'IT assets: ' + (assets||'Not specified') + '\n' +
    'Audit period: ' + (period||'Not specified') + '\n' +
    'Key risk areas: ' + (risks||'Not specified') + '\n\n' +
    'INSTRUCTIONS\n' +
    'Produce a complete Phase 1 Entity Risk Profile with all 5 sections fully developed:\n\n' +
    '1. TIER CLASSIFICATION\n' +
    '   - Use exact RBI terminology: ' + tierLabel + '\n' +
    '   - Never use generic Tier-1/Tier-2/Tier-3 labels\n' +
    '   - State specific RBI IT Gov MD 2023 obligations that apply to this tier (cite Chapter and Section number) [VT]\n' +
    '   - State CERT-In Directions April 2022 obligations — incident reporting SLA is 6 hours from detection, not 72 hours [VT]\n\n' +
    '2. TOP 5 ASSURANCE DOMAINS\n' +
    '   - Select from AD-01 to AD-07 only\n' +
    '   - For each: state the domain, why it applies to this entity, and the governing regulation with section number [VT]\n\n' +
    '3. TIER-DRIFT ALERT MATRIX\n' +
    '   - What additional obligations trigger if entity moves UP one tier\n' +
    '   - What obligations reduce if entity moves DOWN one tier\n\n' +
    '4. CII DESIGNATION ASSESSMENT\n' +
    '   - Is this entity likely CII-designated under NCIIPC? State reasoning.\n' +
    '   - If uncertain, apply BS-04 presumptive treatment and state it explicitly\n\n' +
    '5. RECOMMENDED AUDIT FOCUS AREAS\n' +
    '   - Minimum 4 specific focus areas derived from the entity risk areas provided\n' +
    '   - Each linked to a control domain (CBS/IAM/CLD/API/INC/TPR/DLP/AUD)\n\n' +
    'CITATION RULES (mandatory)\n' +
    '- Every regulatory citation must include: document name + Chapter/Section number + [VT] tag\n' +
    '- Example correct format: RBI IT Gov MD 2023, Chapter 5, Section 5.3 [VT]\n' +
    '- Example correct format: CERT-In Directions April 2022, Direction 6(a) [VT]\n' +
    '- Never cite a regulation without a section number\n' +
    '- Flag all DPDP-related items with [BS-01] — Rules not yet notified\n' +
    '- Incident reporting SLA is always 6 hours — never state 24 hours, 48 hours, or 72 hours\n' +
    '- Do not reference GDPR, SOC 2, ISO 27001, or NIST as primary drivers';

  try {
    var result = await callAPI(prompt, 2000);
    document.getElementById('ep-output').textContent = result;
    document.getElementById('ep-output').classList.add('visible');
    document.getElementById('header-block-entity').style.display = 'block';
    document.getElementById('hb-tier').textContent = type;
    document.getElementById('hb-date').textContent = new Date().toLocaleString('en-IN');
    document.getElementById('entity-badge-topbar').innerHTML = '<span class="tier-badge">' + type + '</span>';
  } catch(e) {
    document.getElementById('ep-output').textContent = 'Error: ' + e.message;
    document.getElementById('ep-output').classList.add('visible');
  } finally {
    document.getElementById('ep-spinner').classList.remove('visible');
    document.getElementById('ep-generate-btn').disabled = false;
  }
}

async function saveEntityToDB() {
  if (!currentUser) return;
  var payload = {
    user_id:    currentUser.id,
    name:       document.getElementById('ep-name').value.trim(),
    type:       document.getElementById('ep-type').value,
    cbs:        document.getElementById('ep-cbs').value.trim(),
    cloud:      document.getElementById('ep-cloud').value,
    assets:     document.getElementById('ep-assets').value.trim(),
    period:     document.getElementById('ep-period').value.trim(),
    risks:      document.getElementById('ep-risks').value.trim(),
    profile_ai: document.getElementById('ep-output').textContent || null
  };
  if (!payload.name || !payload.type) { showToast('Enter entity name and type first'); return; }
  var res = await sb.from('entities').insert(payload).select();
  if (res.error) { showToast('Save failed: ' + res.error.message); return; }
  currentEntityId = res.data[0].id;
  showToast('Entity saved to Supabase');
}

async function loadEntitiesFromDB() {
  if (!currentUser) return;
  var res = await sb.from('entities').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(1);
  if (res.error || !res.data || !res.data.length) { showToast('No saved entity found'); return; }
  var e = res.data[0];
  currentEntityId = e.id;
  document.getElementById('ep-name').value   = e.name   || '';
  document.getElementById('ep-type').value   = e.type   || '';
  document.getElementById('ep-cbs').value    = e.cbs    || '';
  document.getElementById('ep-cloud').value  = e.cloud  || '';
  document.getElementById('ep-assets').value = e.assets || '';
  document.getElementById('ep-period').value = e.period || '';
  document.getElementById('ep-risks').value  = e.risks  || '';
  if (e.profile_ai) {
    document.getElementById('ep-output').textContent = e.profile_ai;
    document.getElementById('ep-output').classList.add('visible');
  }
  document.getElementById('entity-badge-topbar').innerHTML = '<span class="tier-badge">' + e.type + '</span>';
  showToast('Entity loaded from Supabase');
}
