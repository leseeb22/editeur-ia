const els = {
  chat: document.getElementById('chat'),
  input: document.getElementById('input'),
  form: document.getElementById('composer'),
  send: document.getElementById('sendBtn'),
  stop: document.getElementById('stopBtn'),
  clear: document.getElementById('clearBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  apiKey: document.getElementById('apiKey'),
  model: document.getElementById('model'),
  loadModels: document.getElementById('loadModels'),
  testApiBtn: document.getElementById('testApiBtn'),
  cancelSettings: document.getElementById('cancelSettings'),
  appTitle: document.getElementById('appTitle'),
  appTitleInput: document.getElementById('appTitleInput'),
  systemPrompt: document.getElementById('systemPrompt'),
  welcomeMessage: document.getElementById('welcomeMessage'),
  streamingToggle: document.getElementById('streamingToggle'),
  themeSelect: document.getElementById('themeSelect'),
  homepageUrl: document.getElementById('homepageUrl'),
  historyBtn: document.getElementById('historyBtn'),
  historyModal: document.getElementById('historyModal'),
  historyList: document.getElementById('historyList'),
  newConvBtn: document.getElementById('newConvBtn'),
  closeHistory: document.getElementById('closeHistory'),
  apiTestResult: document.getElementById('apiTestResult'),
};

const state = {
  messages: [],
  model: localStorage.getItem('model') || 'openrouter/auto',
  apiKey: localStorage.getItem('apiKey') || '',
  config: {
    title: localStorage.getItem('title') || 'chatia',
    systemPrompt: localStorage.getItem('systemPrompt') || 'Vous êtes un assistant utile.',
    welcomeMessage: localStorage.getItem('welcomeMessage') || '',
    streaming: JSON.parse(localStorage.getItem('streaming') ?? 'true'),
    theme: localStorage.getItem('theme') || 'system',
    homepageUrl: localStorage.getItem('homepageUrl') || '',
  },
  currentConvId: localStorage.getItem('currentConvId') || null,
  currentAbort: null,
};

function normalizeUrl(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
}

function renderMessage(role, content, modelUsed='') {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const name = role === 'user' ? 'Vous' : 'Assistant';
  const meta = modelUsed ? `<div class="meta">via ${escapeHtml(modelUsed)}</div>` : '<div class="meta"></div>';
  div.innerHTML = `<div class="role">${name}</div><div class="content">${escapeHtml(content)}</div>${meta}`;
  els.chat.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function applyTitle() {
  const t = state.config.title || 'chatia';
  if (els.appTitle) els.appTitle.textContent = t;
  document.title = `${t} • OpenRouter`;
  const url = normalizeUrl(state.config.homepageUrl || '');
  if (els.appTitle) {
    if (url) {
      els.appTitle.setAttribute('href', url);
      els.appTitle.setAttribute('target', '_blank');
      els.appTitle.setAttribute('rel', 'noopener noreferrer');
    } else {
      els.appTitle.removeAttribute('href');
      els.appTitle.removeAttribute('target');
      els.appTitle.removeAttribute('rel');
    }
  }
}

function applyTheme() {
  const theme = state.config.theme || 'system';
  document.documentElement.setAttribute('data-theme', theme);
}

function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8); return v.toString(16); }); }
function loadConversations() { try { return JSON.parse(localStorage.getItem('conversations') || '[]'); } catch { return []; } }
function saveConversations(convs) { localStorage.setItem('conversations', JSON.stringify(convs)); }

function startNewConversation() {
  state.messages = [];
  const id = uuid();
  state.currentConvId = id; localStorage.setItem('currentConvId', id);
  const convs = loadConversations();
  convs.unshift({ id, title: 'Nouvelle conversation', messages: [], model: state.model, createdAt: Date.now(), updatedAt: Date.now() });
  saveConversations(convs);
  els.chat.innerHTML = '';
  renderWelcome();
}

function updateCurrentConversation() {
  if (!state.currentConvId) return;
  const convs = loadConversations();
  const idx = convs.findIndex(c => c.id === state.currentConvId);
  if (idx === -1) return;
  convs[idx].messages = state.messages; convs[idx].model = state.model;
  if (state.messages.length && (!convs[idx].title || convs[idx].title === 'Nouvelle conversation')) {
    const first = state.messages.find(m => m.role === 'user'); if (first) convs[idx].title = (first.content||'').slice(0,60);
  }
  convs[idx].updatedAt = Date.now(); saveConversations(convs);
}

function renderHistoryList() {
  const convs = loadConversations();
  els.historyList.innerHTML = '';
  if (!convs.length) { els.historyList.textContent = 'Aucune conversation.'; return; }
  for (const c of convs) {
    const row = document.createElement('div'); row.className = 'history-item';
    row.innerHTML = `<div><div class="title">${escapeHtml(c.title||'Sans titre')}</div><div class="meta">${new Date(c.updatedAt).toLocaleString()}</div></div>
    <div class="actions"><button data-act="load" class="btn btn-sm btn-outline-secondary">Ouvrir</button>
    <button data-act="rename" class="btn btn-sm btn-outline-secondary">Renommer</button>
    <button data-act="delete" class="btn btn-sm btn-outline-secondary">Supprimer</button></div>`;
    row.querySelector('[data-act="load"]').onclick = () => {
      state.currentConvId = c.id; localStorage.setItem('currentConvId', c.id);
      state.messages = c.messages||[]; els.chat.innerHTML=''; for (const m of state.messages) renderMessage(m.role, m.content);
      els.historyModal.close(); };
    row.querySelector('[data-act="rename"]').onclick = () => {
      const title = prompt('Nouveau titre:', c.title||''); if (title==null) return;
      const convs2 = loadConversations(); const k = convs2.findIndex(v=>v.id===c.id);
      if (k!==-1) { convs2[k].title = title; convs2[k].updatedAt=Date.now(); saveConversations(convs2); renderHistoryList(); }
    };
    row.querySelector('[data-act="delete"]').onclick = () => {
      if (!confirm('Supprimer cette conversation ?')) return;
      let convs2 = loadConversations(); convs2 = convs2.filter(v=>v.id!==c.id); saveConversations(convs2);
      if (state.currentConvId===c.id) { state.currentConvId=null; localStorage.removeItem('currentConvId'); startNewConversation(); }
      renderHistoryList(); };
    els.historyList.appendChild(row);
  }
}

function loadSettingsToUI() {
  els.apiKey.value = state.apiKey;
  els.appTitleInput.value = state.config.title;
  els.systemPrompt.value = state.config.systemPrompt;
  els.welcomeMessage.value = state.config.welcomeMessage || '';
  els.streamingToggle.checked = !!state.config.streaming;
  els.themeSelect.value = state.config.theme || 'system';
  els.homepageUrl.value = state.config.homepageUrl || '';
  if (!els.model.options.length) {
    const opt = document.createElement('option'); opt.value = state.model; opt.textContent = state.model; els.model.appendChild(opt);
  }
  els.model.value = state.model;
}

async function fetchModels() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${state.apiKey}`, 'X-Title': state.config.title || 'chatia' },
  });
  if (!res.ok) throw new Error('Impossible de charger les modèles');
  const data = await res.json(); const models = (data.data || []).filter(m => !m.archived);
  els.model.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option'); opt.value = m.id;
    const euro = m.pricing?.prompt ? ` (€ ${m.pricing.prompt}/M tok)` : '';
    opt.textContent = `${m.id}${euro}`; els.model.appendChild(opt);
  }
  const found = [...els.model.options].some(o => o.value === state.model);
  els.model.value = found ? state.model : (els.model.options[0]?.value || 'openrouter/auto');
}

function renderAssistantPlaceholder() {
  const div = document.createElement('div'); div.className = 'msg assistant';
  div.innerHTML = `<div class="role">Assistant</div><div class="content"><div class="skeleton"><div class="line wide"></div><div class="line short"></div></div></div><div class="meta"><span class="spinner" aria-hidden="true"></span> En cours...</div>`;
  const contentEl = div.querySelector('.content'); const metaEl = div.querySelector('.meta');
  els.chat.appendChild(div); div.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return { div, contentEl, metaEl };
}

async function sendMessage(text) {
  const userMsg = { role: 'user', content: text };
  state.messages.push(userMsg);
  renderMessage('user', text);
  els.send.disabled = true;
  if (els.stop) els.stop.disabled = false;
  els.input.value = '';

  const { div, contentEl, metaEl } = renderAssistantPlaceholder();
  const system = { role: 'system', content: state.config.systemPrompt || '' };
  let finalText = ''; let modelUsed = '';

  const controller = new AbortController(); state.currentAbort = controller;
  // Delay loading UI to avoid flicker
  let uiDelayTimer = setTimeout(() => {
    try { els.send.classList.add('loading'); els.send.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Génère'; } catch {}
  }, 200);

  try {
    const isStreaming = !!state.config.streaming;
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = JSON.stringify({ model: state.model, messages: [system, ...state.messages], stream: isStreaming });
    const headers = { 'Authorization': `Bearer ${state.apiKey}`, 'Content-Type': 'application/json', 'X-Title': state.config.title || 'chatia' };
    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok && ct.includes('application/json')) { const err = await res.json().catch(()=>({})); throw new Error(err.error?.message || err.error || err.message || 'Erreur API'); }

    if (isStreaming && ct.includes('text/event-stream')) {
      const reader = res.body.getReader(); const decoder = new TextDecoder('utf-8'); let buffer = '';
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/); buffer = parts.pop() || '';
        for (const part of parts) {
          const lines = part.split(/\r?\n/);
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim(); if (data === '[DONE]') { buffer = ''; break; }
            try {
              const json = JSON.parse(data);
              if (json.model && !modelUsed) modelUsed = json.model;
              const delta = json.choices?.[0]?.delta || {};
              if (delta.content) { finalText += delta.content; contentEl.textContent = finalText; div.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
            } catch {}
          }
        }
      }
      state.messages.push({ role: 'assistant', content: finalText });
    } else {
      const data = await res.json(); if (data.model) modelUsed = data.model;
      const content = data.choices?.[0]?.message?.content || '(réponse vide)'; finalText = content; contentEl.textContent = finalText;
      state.messages.push({ role: 'assistant', content: finalText });
    }
    if (metaEl) metaEl.textContent = modelUsed ? `via ${modelUsed}` : '';
    updateCurrentConversation();
  } catch (e) {
    if (e.name === 'AbortError') { contentEl.textContent = finalText || '(arrêté)'; }
    else { contentEl.textContent = `Erreur: ${e.message}`; }
  } finally {
    els.send.disabled = false; els.send.classList.remove('loading'); els.send.textContent = 'Envoyer';
    try { clearTimeout(uiDelayTimer); } catch{}
    if (els.stop) els.stop.disabled = true; state.currentAbort = null;
  }
}

// Resize textarea
function autoResize() { els.input.style.height = 'auto'; els.input.style.height = Math.min(220, Math.max(48, els.input.scrollHeight)) + 'px'; }

// Events
els.settingsBtn.addEventListener('click', () => { loadSettingsToUI(); els.settingsModal.showModal(); });
els.cancelSettings.addEventListener('click', () => els.settingsModal.close());
els.loadModels.addEventListener('click', async () => { state.apiKey = els.apiKey.value.trim(); try { await fetchModels(); } catch (e) { alert(e.message||e); } });
if (els.testApiBtn) {
  els.testApiBtn.addEventListener('click', async () => {
    state.apiKey = els.apiKey.value.trim();
    if (!state.apiKey) { alert('Veuillez entrer votre clé OpenRouter'); return; }
    els.testApiBtn.disabled = true;
    if (els.apiTestResult) els.apiTestResult.textContent = 'Test en cours…';
    try {
      // 1) Test models endpoint
      const r1 = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${state.apiKey}`, 'X-Title': state.config.title || 'chatia' },
      });
      if (!r1.ok) {
        let txt = await r1.text();
        throw new Error(`Modèles: ${r1.status} ${txt}`);
      }
      // 2) Test a tiny chat completion (non-stream)
      const r2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.apiKey}`, 'Content-Type': 'application/json', 'X-Title': state.config.title || 'chatia' },
        body: JSON.stringify({ model: state.model || 'openrouter/auto', stream: false, messages: [{ role: 'user', content: 'OK?' }] })
      });
      const data2 = await r2.json();
      if (!r2.ok) throw new Error(data2.error?.message || data2.error || data2.message || 'Erreur API chat');
      const used = data2.model || '';
      const content = data2.choices?.[0]?.message?.content || '';
      if (els.apiTestResult) els.apiTestResult.textContent = `Succès. Modèle: ${used || '(inconnu)'} • Réponse: ${content.slice(0,80)}`;
    } catch (e) {
      if (els.apiTestResult) els.apiTestResult.textContent = `Échec: ${e.message}`;
    } finally {
      els.testApiBtn.disabled = false;
    }
  });
}
els.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault(); state.apiKey = els.apiKey.value.trim(); state.model = els.model.value;
  state.config.title = els.appTitleInput.value.trim() || 'chatia';
  state.config.systemPrompt = els.systemPrompt.value; state.config.welcomeMessage = els.welcomeMessage.value;
  state.config.streaming = !!els.streamingToggle.checked; state.config.theme = els.themeSelect.value || 'system';
  state.config.homepageUrl = els.homepageUrl.value.trim();
  localStorage.setItem('apiKey', state.apiKey); localStorage.setItem('model', state.model);
  localStorage.setItem('title', state.config.title); localStorage.setItem('systemPrompt', state.config.systemPrompt);
  localStorage.setItem('welcomeMessage', state.config.welcomeMessage);
  localStorage.setItem('streaming', JSON.stringify(state.config.streaming)); localStorage.setItem('theme', state.config.theme);
  localStorage.setItem('homepageUrl', state.config.homepageUrl);
  applyTitle(); applyTheme(); els.settingsModal.close();
});

if (els.themeSelect) { els.themeSelect.addEventListener('change', () => { const v = els.themeSelect.value || 'system'; state.config.theme = v; localStorage.setItem('theme', v); applyTheme(); }); }

els.clear.addEventListener('click', () => { if (!confirm('Effacer la conversation ?')) return; state.messages=[]; els.chat.innerHTML=''; updateCurrentConversation(); renderWelcome(); });
els.form.addEventListener('submit', (e) => { e.preventDefault(); const text = els.input.value.trim(); if (!text) return; if (!state.apiKey) { alert('Configurez votre clé OpenRouter dans Paramètres.'); return; } sendMessage(text); });
els.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); els.form.requestSubmit(); } });
els.input.addEventListener('input', autoResize); autoResize();

// Stop generation
if (els.stop) {
  els.stop.addEventListener('click', () => { try { state.currentAbort?.abort(); } catch{}; els.stop.disabled = true; });
}

// Auto-load models when opening settings and key is present
els.settingsBtn.addEventListener('click', async () => { const key=(els.apiKey.value||state.apiKey||'').trim(); if (key) { state.apiKey=key; try { await fetchModels(); } catch{} } });
els.apiKey.addEventListener('change', async () => { state.apiKey = (els.apiKey.value||'').trim(); if (state.apiKey) { try { await fetchModels(); } catch{} } });

function renderWelcome() {
  const msg = (state.config.welcomeMessage || '').trim();
  if (msg) renderMessage('assistant', msg); else renderMessage('assistant', 'Bonjour ! Ouvrez Paramètres pour configurer la clé OpenRouter, le modèle, le titre et le prompt système.');
}

applyTitle(); applyTheme();
if (!state.currentConvId) startNewConversation(); else { const conv = loadConversations().find(c=>c.id===state.currentConvId); if (conv) { state.messages=conv.messages||[]; for (const m of state.messages) renderMessage(m.role, m.content); } else startNewConversation(); }

// History dialog open/close
els.historyBtn.addEventListener('click', () => { renderHistoryList(); els.historyModal.showModal(); });
els.closeHistory.addEventListener('click', () => els.historyModal.close());
els.newConvBtn.addEventListener('click', () => { startNewConversation(); renderHistoryList(); });
