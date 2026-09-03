// js/formatter.js — AI output formatter
// Converts structured AI plain text into clean HTML
// No external dependencies — pure regex and DOM string building
// Depends on: nothing (loaded before all feature modules)

function formatAIOutput(text) {
  if (!text) return '';

  var lines = text.split('\n');
  var html  = '';
  var inOL  = false;
  var inUL  = false;

  function closeList() {
    if (inOL) { html += '</ol>'; inOL = false; }
    if (inUL) { html += '</ul>'; inUL = false; }
  }

  function tagifySourceTags(str) {
    // Colour source truth and blind spot tags
    str = str.replace(/\[VERIFIED-TRAINING\]/g, '<span class="tag tag-vt">[VT]</span>');
    str = str.replace(/\[VT\]/g,  '<span class="tag tag-vt">[VT]</span>');
    str = str.replace(/\[V\]/g,   '<span class="tag tag-v">[V]</span>');
    str = str.replace(/\[I\]/g,   '<span class="tag tag-i">[I]</span>');
    str = str.replace(/\[U\]/g,   '<span class="tag tag-u">[U]</span>');
    str = str.replace(/\[FR\]/g,  '<span class="tag tag-fr">[FR]</span>');
    str = str.replace(/\[BS-0?(\d+)\]/g, '<span class="tag tag-bs">[BS-$1]</span>');
    // Risk badges
    str = str.replace(/\bCritical\b/g, '<span class="risk-badge critical">Critical</span>');
    str = str.replace(/\bHigh\b/g,     '<span class="risk-badge high">High</span>');
    str = str.replace(/\bMedium\b/g,   '<span class="risk-badge medium">Medium</span>');
    str = str.replace(/\bLow\b/g,      '<span class="risk-badge low">Low</span>');
    // Alert badges
    str = str.replace(/\[DRIFT-RISK\]/g,  '<span class="alert-badge red">[DRIFT-RISK]</span>');
    str = str.replace(/\[AMENDMENT\]/g,   '<span class="alert-badge">[AMENDMENT]</span>');
    str = str.replace(/\[FETCH-FAILED\]/g,'<span class="tag tag-fr">[FETCH-FAILED]</span>');
    return str;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function processInline(str) {
    // Escape first, then apply tag replacements
    return tagifySourceTags(escapeHTML(str));
  }

  lines.forEach(function(line) {
    var trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeList();
      html += '<br>';
      return;
    }

    // Horizontal divider ─────
    if (/^[─\-]{4,}$/.test(trimmed)) {
      closeList();
      html += '<hr>';
      return;
    }

    // ALL CAPS section header (min 4 chars, no lowercase)
    if (/^[A-Z0-9\s&\/\-–—:()]{4,}$/.test(trimmed) && trimmed.length < 80 && /[A-Z]{2}/.test(trimmed)) {
      closeList();
      html += '<h3>' + processInline(trimmed) + '</h3>';
      return;
    }

    // CoT Step lines: "Step N —" or "Step N:"
    var stepMatch = trimmed.match(/^(Step\s+\d+\s*[—:\-]+)\s*(.+)$/i);
    if (stepMatch) {
      closeList();
      html += '<div class="step-block">' +
        '<div class="step-title">' + processInline(stepMatch[1].trim()) + '</div>' +
        '<div class="step-body">' + processInline(stepMatch[2].trim()) + '</div>' +
        '</div>';
      return;
    }

    // Numbered list items: "1." "2." etc
    var olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!inOL) { if (inUL) { html += '</ul>'; inUL = false; } html += '<ol>'; inOL = true; }
      html += '<li>' + processInline(olMatch[2]) + '</li>';
      return;
    }

    // Bullet list items: "- " or "• "
    var ulMatch = trimmed.match(/^[-•*]\s+(.+)$/);
    if (ulMatch) {
      if (!inUL) { if (inOL) { html += '</ol>'; inOL = false; } html += '<ul>'; inUL = true; }
      html += '<li>' + processInline(ulMatch[1]) + '</li>';
      return;
    }

    // Field row: "Label: value" or "Label    value" (padded)
    // Matches "Word(s):" pattern at start of line
    var fieldMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9 _\/&()\-]{1,35}):\s+(.+)$/);
    if (fieldMatch) {
      closeList();
      html += '<div class="field-row">' +
        '<span class="field-label">' + processInline(fieldMatch[1]) + '</span>' +
        '<span class="field-value">' + processInline(fieldMatch[2]) + '</span>' +
        '</div>';
      return;
    }

    // Padded field row from CONTROL_OBJECT display: "Name            value"
    var paddedMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9 _.\/]{1,20})\s{3,}(.+)$/);
    if (paddedMatch) {
      closeList();
      html += '<div class="field-row">' +
        '<span class="field-label">' + processInline(paddedMatch[1].trim()) + '</span>' +
        '<span class="field-value">' + processInline(paddedMatch[2].trim()) + '</span>' +
        '</div>';
      return;
    }

    // Default: plain paragraph line
    closeList();
    html += '<p>' + processInline(trimmed) + '</p>';
  });

  closeList();
  return html;
}
