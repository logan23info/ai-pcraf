// js/ui.js — UI primitives: tabs, toast, checklist modal
// Depends on: config.js (CHECKLIST_ITEMS, checklistState), controls.js (loadControlsFromDB), export.js (updateStats)

var TABS   = ['entity','controls','truth','blindspots','dossier','daksh','export'];
var TITLES = {
  entity:     'Entity Profiler',
  controls:   'Control Matrix Builder',
  truth:      'Truth Table — Incident Classifier',
  blindspots: 'Blind Spot Register',
  dossier:    'Regulatory Dossier — Live Fetch Engine',
  daksh:      'DAKSH Incident Payload Generator',
  export:     'Export & Backup'
};

function showTab(name) {
  TABS.forEach(function(t) {
    document.getElementById('tab-'+t).classList.toggle('active', t===name);
    document.getElementById('nav-'+t).classList.toggle('active', t===name);
  });
  document.getElementById('topbar-title').textContent = TITLES[name];
  if (name === 'export')   updateStats();
  if (name === 'controls') loadControlsFromDB();
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

function openChecklist() {
  var wrap = document.getElementById('checklist-items');
  wrap.innerHTML = CHECKLIST_ITEMS.map(function(item, i) {
    return '<div class="checklist-item">' +
      '<input type="checkbox" id="cl-' + i + '" ' + (checklistState[i] ? 'checked' : '') + ' onchange="toggleCheck(' + i + ')">' +
      '<label for="cl-' + i + '" class="' + (checklistState[i] ? 'done' : '') + '">' + item + '</label></div>';
  }).join('');
  document.getElementById('checklist-modal').classList.add('open');
}
function toggleCheck(i) {
  checklistState[i] = !checklistState[i];
  var lbl = document.querySelector('label[for="cl-' + i + '"]');
  if (lbl) lbl.classList.toggle('done', checklistState[i]);
}
function closeChecklist() { document.getElementById('checklist-modal').classList.remove('open'); }
function resetChecklist() { checklistState = Array(10).fill(false); openChecklist(); }
