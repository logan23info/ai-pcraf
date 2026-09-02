// AI-PCRAF M3 — Vercel Serverless Function
// /api/fetch-regulatory.js
// Server-side regulatory fetch — avoids CORS blocks on government sites
// Returns structured dossier JSON for each of the 6 FETCH sources

const FETCH_SOURCES = [
  {
    id:      'FETCH-01',
    label:   'RBI IT Governance Master Direction',
    url:     'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx',
    extract: extractRBI
  },
  {
    id:      'FETCH-02',
    label:   'CERT-In Directions & Advisories',
    url:     'https://www.cert-in.org.in',
    extract: extractCERTIn
  },
  {
    id:      'FETCH-03',
    label:   'MeitY — DPDP Rules notification status',
    url:     'https://www.meity.gov.in',
    extract: extractMeitY
  },
  {
    id:      'FETCH-04',
    label:   'ReBIT Cybersecurity Assessment Framework',
    url:     'https://rebit.org.in',
    extract: extractReBIT
  },
  {
    id:      'FETCH-05',
    label:   'NCIIPC CII Guidelines',
    url:     'https://nciipc.gov.in',
    extract: extractNCIIPC
  },
  {
    id:      'FETCH-06',
    label:   'IFTAS SFMS/INFINET Security Standards',
    url:     'https://iftas.org.in',
    extract: extractIFTAS
  }
];

// ── EXTRACTOR FUNCTIONS ────────────────────────────────────────────────────
// Each extractor receives raw HTML text and returns { summary, amendment_detected, amendment_note }

function extractRBI(html) {
  var result = { summary: '', amendment_detected: false, amendment_note: '' };
  // Look for IT Governance MD reference
  var itGovMatch = html.match(/IT\s+Governance[^<]{0,120}/i);
  if (itGovMatch) result.summary = 'IT Governance MD found: ' + itGovMatch[0].trim().substring(0, 120);
  else result.summary = 'RBI Master Directions page fetched — IT Governance MD reference not auto-parsed. Verify manually.';
  // Look for 2024 or 2025 amendment signals
  if (/2024|2025|2026/i.test(html) && /amend|supersed|replac|updat/i.test(html)) {
    result.amendment_detected = true;
    result.amendment_note = 'Possible amendment or update detected post-2023. Manual review required — check for circulars superseding RBI IT Gov MD 2023.';
  }
  return result;
}

function extractCERTIn(html) {
  var result = { summary: '', amendment_detected: false, amendment_note: '' };
  if (/direction|advisory|guideline/i.test(html)) {
    result.summary = 'CERT-In site fetched — Directions/Advisories section present. Verify April 2022 Directions are still current.';
  } else {
    result.summary = 'CERT-In site fetched — manual review required for current direction status.';
  }
  if (/2024|2025|2026/i.test(html) && /direction|amendment|new/i.test(html)) {
    result.amendment_detected = true;
    result.amendment_note = 'Possible new CERT-In direction or advisory detected post-April 2022. Review for SLA or scope changes.';
  }
  return result;
}

function extractMeitY(html) {
  var result = { summary: '', amendment_detected: false, amendment_note: '' };
  if (/DPDP|personal data|data protection/i.test(html)) {
    result.summary = 'MeitY site fetched — DPDP content detected.';
    if (/rule|notification|gazette/i.test(html)) {
      result.amendment_detected = true;
      result.amendment_note = 'DPDP Rules or gazette notification content detected. BS-01 may be resolvable — verify if Rules have been formally notified.';
    } else {
      result.summary += ' No Rules notification detected — BS-01 remains active.';
    }
  } else {
    result.summary = 'MeitY site fetched — DPDP Rules status could not be auto-parsed. BS-01 remains active. Verify manually.';
  }
  return result;
}

function extractReBIT(html) {
  var result = { summary: '', amendment_detected: false, amendment_note: '' };
  if (/cybersecurity|assessment|framework/i.test(html)) {
    result.summary = 'ReBIT site fetched — Cybersecurity Assessment Framework content present.';
    var versionMatch = html.match(/version\s*[\d.]+/i);
    if (versionMatch) {
      result.summary += ' Version reference: ' + versionMatch[0];
      result.amendment_detected = true;
      result.amendment_note = 'Version reference detected — confirm this matches the version used in control citations. BS-03 may be resolvable.';
    }
  } else {
    result.summary = 'ReBIT site fetched — framework version could not be auto-parsed. BS-03 remains active. Verify manually.';
  }
  return result;
}

function extractNCIIPC(html) {
  var result = { summary: '', amendment_detected: false, amendment_note: '' };
  if (/critical information infrastructure|CII|guideline/i.test(html)) {
    result.summary = 'NCIIPC site fetched — CII guidelines content present.';
    if (/financial|bank|NBFC/i.test(html)) {
      result.amendment_detected = true;
      result.amendment_note = 'Financial sector CII reference detected. Verify if formal designation list has been updated. BS-04 may be partially resolvable.';
    }
  } else {
    result.summary = 'NCIIPC site fetched — CII designation content could not be auto-parsed. BS-04 remains active. Verify manually.';
  }
  return result;
}

function extractIFTAS(html) {
  var result = { summary: '', amendment_detected: false, amendment_note: '' };
  if (/SFMS|INFINET|security/i.test(html)) {
    result.summary = 'IFTAS site fetched — SFMS/INFINET security content present.';
    var dateMatch = html.match(/20(2[3-9]|[3-9]\d)/);
    if (dateMatch) {
      result.summary += ' Year reference found: ' + dateMatch[0] + '.';
      result.amendment_detected = true;
      result.amendment_note = 'Recent year reference detected — verify SFMS security standards version is current. BS-08 may be resolvable.';
    }
  } else {
    result.summary = 'IFTAS site fetched — SFMS/INFINET standards could not be auto-parsed. BS-08 remains active. Verify manually.';
  }
  return result;
}

// ── FETCH HANDLER ──────────────────────────────────────────────────────────
async function fetchOne(source) {
  var startTime = Date.now();
  try {
    var res = await fetch(source.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-PCRAF-Audit-Bot/2.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return {
        id:                source.id,
        label:             source.label,
        url:               source.url,
        status:            'FETCH-FAILED',
        http_status:       res.status,
        result_summary:    'HTTP ' + res.status + ' — site returned error. Verify manually at ' + source.url,
        amendment_detected: false,
        amendment_note:    '',
        duration_ms:       Date.now() - startTime
      };
    }

    var html = await res.text();
    var extracted = source.extract(html);

    return {
      id:                source.id,
      label:             source.label,
      url:               source.url,
      status:            'FETCHED',
      http_status:       res.status,
      result_summary:    extracted.summary,
      amendment_detected: extracted.amendment_detected,
      amendment_note:    extracted.amendment_note,
      duration_ms:       Date.now() - startTime
    };

  } catch (err) {
    return {
      id:                source.id,
      label:             source.label,
      url:               source.url,
      status:            'FETCH-FAILED',
      http_status:       null,
      result_summary:    'Fetch error: ' + err.message + '. Site may block server-side requests or use JS rendering. Verify manually.',
      amendment_detected: false,
      amendment_note:    '',
      duration_ms:       Date.now() - startTime
    };
  }
}

// ── MAIN HANDLER ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var fetchIds = req.body && req.body.fetchIds;

  // Filter to requested IDs or run all
  var sources = fetchIds
    ? FETCH_SOURCES.filter(function(s) { return fetchIds.includes(s.id); })
    : FETCH_SOURCES;

  if (!sources.length) {
    return res.status(400).json({ error: 'No valid fetch IDs provided' });
  }

  // Run all fetches in parallel
  var results = await Promise.all(sources.map(fetchOne));

  var summary = {
    total:             results.length,
    fetched:           results.filter(function(r) { return r.status === 'FETCHED'; }).length,
    failed:            results.filter(function(r) { return r.status === 'FETCH-FAILED'; }).length,
    amendments_found:  results.filter(function(r) { return r.amendment_detected; }).length,
    timestamp:         new Date().toISOString()
  };

  return res.status(200).json({ results: results, summary: summary });
}
