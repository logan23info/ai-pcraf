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

  var prompt = 'You are a Principal Cyber Risk & Compliance Consultant under AI-PCRAF v2.0 for Indian BFSI IT Audit.\n\n' +
    'Entity: ' + name + ' | Type: ' + type + ' | CBS: ' + (cbs||'Unknown') + ' | Cloud: ' + cloud +
    ' | Assets: ' + (assets||'Not specified') + ' | Period: ' + (period||'Not specified') +
    ' | Risk areas: ' + (risks||'Not specified') + '\n\n' +
    'Produce Phase 1 Entity Risk Profile:\n' +
    '1. Tier classification and RBI IT Gov MD 2023 obligations\n' +
    '2. Top 5 assurance domains (AD-01 to AD-07) with rationale\n' +
    '3. Tier-drift alert matrix\n' +
    '4. CII designation assessment (BS-04 if uncertain)\n' +
    '5. Recommended audit focus areas\n\n' +
    'Tag citations [VT]. Flag DPDP items [BS-01].';

  try {
    var result = await callAPI(prompt, 1000);
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
