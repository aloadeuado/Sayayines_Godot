import { SYNC_COLLECTIONS, createEnvSyncClient, syncEnvironments } from '../services/firebase/env-sync.js';

// Sección «Sincronizar ambientes» de /settings. Siempre se ven las diferencias
// antes de escribir; escribir en prd pide teclear «prd».
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ACTION_LABELS = { create: 'Crear', update: 'Actualizar' };

export function startEnvSyncPanel(cfg) {
  if (!$('#env-sync-form')) return;
  const client = createEnvSyncClient({ projectId: cfg.projectId, apiKey: cfg.apiKey, databaseId: cfg.databaseId, origin: cfg.firestoreOrigin });
  let previewKey = '';
  $('#env-sync-collections').innerHTML = SYNC_COLLECTIONS.map(c => `<label class="character-setting"><span>${escape(c.label)} · <code>${escape(c.collection)}</code></span><input type="checkbox" data-sync-key="${escape(c.key)}" ${c.key === 'roles' ? 'checked' : ''}></label>`).join('');

  const status = (text, kind = '') => { $('#env-sync-status').textContent = text; $('#env-sync-status').dataset.state = kind; };
  const selection = () => ({
    from: $('#env-sync-from').value,
    to: $('#env-sync-to').value,
    keys: [...document.querySelectorAll('[data-sync-key]:checked')].map(i => i.dataset.syncKey)
  });
  const keyOf = s => `${s.from}>${s.to}>${s.keys.join(',')}`;
  const reset = () => {
    previewKey = '';
    $('#env-sync-apply').disabled = true;
    $('#env-sync-prd').hidden = $('#env-sync-to').value !== 'prd';
    $('#env-sync-prd-input').value = '';
  };
  $('#env-sync-form').addEventListener('change', event => { if (event.target.id !== 'env-sync-prd-input') reset(); });
  reset();

  function render(results, applied) {
    $('#env-sync-result').innerHTML = results.map(r => {
      const changes = r.items.filter(i => i.action !== 'same');
      const same = r.items.length - changes.length;
      return `<section class="power-settings-group"><h4>${escape(r.label)} <small><code>${escape(r.collection)}</code></small></h4>
        <p class="settings-help">${changes.length ? `${changes.length} por ${applied ? 'escribir · escritos ' + r.written : 'escribir'}` : 'Sin cambios'} · ${same} iguales${r.targetOnly.length ? ` · ${r.targetOnly.length} solo en destino (no se tocan): ${r.targetOnly.map(escape).join(', ')}` : ''}</p>
        ${changes.length ? `<div class="env-sync-table"><table><thead><tr><th>Documento</th><th>Acción</th><th>Campos</th></tr></thead><tbody>${changes.map(i => `<tr><td><code>${escape(i.id)}</code></td><td>${ACTION_LABELS[i.action]}</td><td>${i.action === 'create' ? `Documento nuevo (${i.changedFields.length} campos)` : i.changedFields.map(escape).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </section>`;
    }).join('');
  }

  async function run(apply) {
    const s = selection();
    if (!s.keys.length) return status('Elige al menos una tabla.', 'error');
    if (s.from === s.to) return status('El origen y el destino deben ser distintos.', 'error');
    const confirmPrd = s.to === 'prd' && $('#env-sync-prd-input').value.trim().toLowerCase() === 'prd';
    if (apply && s.to === 'prd' && !confirmPrd) return status('Escribe «prd» para confirmar la escritura en producción.', 'error');
    if (apply && previewKey !== keyOf(s)) return status('Primero revisa las diferencias de esta selección.', 'error');
    status(apply ? `Sincronizando ${s.from} → ${s.to}…` : `Comparando ${s.from} → ${s.to}…`);
    $('#env-sync-preview').disabled = $('#env-sync-apply').disabled = true;
    try {
      const results = await syncEnvironments({ client, ...s, apply, confirmPrd });
      render(results, apply);
      const pending = results.reduce((n, r) => n + r.items.filter(i => i.action !== 'same').length, 0);
      if (apply) {
        status(`Sincronizado ${s.from} → ${s.to}: ${results.reduce((n, r) => n + r.written, 0)} documentos escritos.`, 'ok');
        previewKey = '';
      } else {
        previewKey = pending ? keyOf(s) : '';
        status(pending ? `${pending} documentos por escribir en ${s.to}. Revisa y pulsa Sincronizar.` : `${s.to} ya está igual a ${s.from} en estas tablas.`, pending ? '' : 'ok');
      }
    } catch (error) {
      status(`No se pudo sincronizar: ${error.message}`, 'error');
    } finally {
      $('#env-sync-preview').disabled = false;
      $('#env-sync-apply').disabled = !previewKey;
    }
  }

  $('#env-sync-preview').addEventListener('click', () => run(false));
  $('#env-sync-form').addEventListener('submit', event => { event.preventDefault(); run(true); });
}
