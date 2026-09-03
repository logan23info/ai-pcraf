// js/dossier.js — Regulatory Dossier: live fetch engine and drift checker
// Depends on: config.js (sb, currentUser, controls), ui.js (showToast)

var lastFetchResults = [];

async function runAllFetches() {
  if (!currentUser) return;
  document.getElementById('dossier-run-btn').disabled = true;
  document.getElementById('dossier-spinner').classList.add('visible');
  document.getElementById('dossier-results').style.display = 'none';
  document.getElementById('dossier-summary').textContent = '';

  try {
    var res = await fetch('/api/fetch-regulatory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fetchIds: ['FETCH-01','FETCH-02','FETCH-03','FETCH-04','FETCH-05','FETCH-06'] })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Fetch endpoint error');

    lastFetchResults = data.results || [];
    var summary = data.summary || {};

    var logRows = lastFetchResults.map(function(r) {
      return { user_id: currentUser.id, fetch_id: r.id, url: r.url,
        status: r.status, result_summary: r.result_summary,
        amendment_detected: r.amendment_detected, amendment_note: r.amendment_note || '' };
    });
    await sb.from('dossier_log').insert(logRows);

    renderDossierResults(lastFetchResults);
    document.getElementById('dossier-summary').textContent =
      summary.fetched + '/' + summary.total + ' fetched  |  ' +
      summary.failed + ' failed  |  ' +
      summary.amendments_found + ' amendment signals';
    checkControlDrift(lastFetchResults);

  } catch(e) {
    document.getElementById('dossier-summary').textContent = 'Error: ' + e.message;
  } finally {
    document.getElementById('dossier-spinner').classList.remove('visible');
    document.getElementById('dossier-run-btn').disabled = false;
    document.getElementById('dossier-results').style.display = 'block';
  }
}

function renderDossierResults(results) {
  var tbody = document.getElementById('dossier-tbody');
  tbody.innerHTML = results.map(function(r) {
    var statusTag = r.status === 'FETCHED'
      ? '<span class="tag tag-v">[V]</span>'
      : '<span class="tag tag-fr">[FETCH-FAILED]</span>';
    var amendTag = r.amendment_detected
      ? '<span class="tag tag-i">[AMENDMENT]</span>'
      : '<span style="color:var(--text-muted);font-size:11px">None</span>';
    return '<tr>' +
      '<td class="mono">' + r.id + '</td>' +
      '<td style="font-size:11px;font-weight:600">' + r.label + '</td>' +
      '<td>' + statusTag + '</td>' +
      '<td>' + amendTag + '</td>' +
      '<td class="wrap" style="font-size:11px">' + (r.result_summary||'—') + '</td>' +
      '<td style="font-size:11px;white-space:nowrap">' + new Date().toLocaleString('en-IN') + '</td></tr>';
  }).join('');

  var amendments = results.filter(function(r) { return r.amendment_detected; });
  var amendBox = document.getElementById('dossier-amendment-box');
  if (amendments.length) {
    amendBox.style.display = 'block';
    amendBox.innerHTML = '<strong>&#9888; Amendment signals detected (' + amendments.length + '):</strong><br>' +
      amendments.map(function(r) { return '<br><strong>' + r.id + ':</strong> ' + r.amendment_note; }).join('');
  } else { amendBox.style.display = 'none'; }
}

function checkControlDrift(fetchResults) {
  var failedFetches    = fetchResults.filter(function(r) { return r.status === 'FETCH-FAILED'; });
  var amendmentFetches = fetchResults.filter(function(r) { return r.amendment_detected; });
  var driftBox = document.getElementById('dossier-drift-box');
  if (!controls.length) { driftBox.style.display = 'none'; return; }

  var driftControls = [];
  controls.forEach(function(c) {
    var ref = (c.codex_ref || '').toLowerCase();
    var isDrift = false; var reason = '';
    if ((ref.includes('rbi')||ref.includes('md')) && amendmentFetches.find(function(f){return f.id==='FETCH-01';})) {
      isDrift = true; reason = 'RBI MD amendment signal — re-verify citation';
    }
    if (ref.includes('cert-in') && amendmentFetches.find(function(f){return f.id==='FETCH-02';})) {
      isDrift = true; reason = 'CERT-In amendment signal — re-verify citation';
    }
    if (ref.includes('dpdp') && amendmentFetches.find(function(f){return f.id==='FETCH-03';})) {
      isDrift = true; reason = 'DPDP Rules signal — BS-01 may be resolvable, re-verify';
    }
    if (ref.includes('rebit') && amendmentFetches.find(function(f){return f.id==='FETCH-04';})) {
      isDrift = true; reason = 'ReBIT version signal — re-verify citation';
    }
    if (ref.includes('nciipc') && failedFetches.find(function(f){return f.id==='FETCH-05';})) {
      isDrift = true; reason = 'NCIIPC fetch failed — BS-04 remains active';
    }
    if ((ref.includes('iftas')||ref.includes('sfms')) && failedFetches.find(function(f){return f.id==='FETCH-06';})) {
      isDrift = true; reason = 'IFTAS fetch failed — BS-08 remains active';
    }
    if (isDrift) driftControls.push({ id: c.id, reason: reason });
  });

  if (driftControls.length) {
    driftBox.style.display = 'block';
    driftBox.innerHTML = '<strong>[DRIFT-RISK] ' + driftControls.length + ' control(s) require re-verification:</strong><br>' +
      driftControls.map(function(d) { return '<br><span class="mono">' + d.id + '</span> — ' + d.reason; }).join('');
  } else { driftBox.style.display = 'none'; }
}

async function loadDossierHistory() {
  if (!currentUser) return;
  var res = await sb.from('dossier_log').select('*').eq('user_id', currentUser.id)
    .order('fetched_at', { ascending: false }).limit(60);
  if (res.error || !res.data || !res.data.length) {
    document.getElementById('dossier-history-tbody').innerHTML =
      '<tr><td colspan="5" style="color:var(--text-muted);font-size:12px">No fetch history — run fetches first</td></tr>';
    return;
  }
  document.getElementById('dossier-history-tbody').innerHTML = res.data.map(function(r) {
    var statusTag = r.status === 'FETCHED' ? '<span class="tag tag-v">[V]</span>' : '<span class="tag tag-fr">[FAILED]</span>';
    var amendTag  = r.amendment_detected ? '<span class="tag tag-i">[AMEND]</span>' : '—';
    return '<tr><td class="mono">' + r.fetch_id + '</td><td>' + statusTag + '</td><td>' + amendTag + '</td>' +
      '<td class="wrap" style="font-size:11px">' + (r.result_summary||'—').substring(0,120) + '</td>' +
      '<td style="font-size:11px;white-space:nowrap">' + new Date(r.fetched_at).toLocaleString('en-IN') + '</td></tr>';
  }).join('');
  showToast('Fetch history loaded — ' + res.data.length + ' records');
}
