/**
 * App.js - Point d'entrée principal de l'application
 * Orchestre tous les modules
 */

import { state, initState, saveConfig, applyTheme } from './state.js';
import { fetchModels, fetchLogs } from './api.js';
import { initFileExplorer } from './fileExplorer.js';
import { initFileManager } from './fileManager.js';
import { initEditorEvents, setEditorTheme } from './editor.js';
import { initDiff } from './diff.js';
import { initChat } from './chat.js';

// Éléments DOM
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const cancelSettings = document.getElementById('cancelSettings');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const editorThemeSelect = document.getElementById('editorTheme');
const themeSelect = document.getElementById('themeSelect');
const loadModelsBtn = document.getElementById('loadModels');

const logsBtn = document.getElementById('logsBtn');
const logsModal = document.getElementById('logsModal');
const logsList = document.getElementById('logsList');
const closeLogs = document.getElementById('closeLogs');

/**
 * Charge les paramètres dans le formulaire
 */
function loadSettingsToUI() {
  apiKeyInput.value = state.config.apiKey;
  modelSelect.value = state.config.model;
  editorThemeSelect.value = state.config.editorTheme;
  themeSelect.value = state.config.theme;
}

/**
 * Sauvegarde les paramètres
 */
function saveSettings() {
  state.config.apiKey = apiKeyInput.value.trim();
  state.config.model = modelSelect.value;
  state.config.editorTheme = editorThemeSelect.value;
  state.config.theme = themeSelect.value;

  saveConfig();
  applyTheme();
  setEditorTheme(state.config.editorTheme);

  settingsModal.close();
}

/**
 * Charge la liste des modèles OpenRouter
 */
async function loadModels() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    alert('Veuillez entrer votre clé API OpenRouter');
    return;
  }

  try {
    loadModelsBtn.disabled = true;
    loadModelsBtn.textContent = 'Chargement...';

    const models = await fetchModels(apiKey);

    modelSelect.innerHTML = '';

    for (const model of models) {
      const option = document.createElement('option');
      option.value = model.id;

      const price = model.pricing?.prompt
        ? ` ($${model.pricing.prompt}/M tok)`
        : '';

      option.textContent = `${model.id}${price}`;
      modelSelect.appendChild(option);
    }

    // Sélectionner le modèle actuel
    const found = [...modelSelect.options].some(o => o.value === state.config.model);
    if (found) {
      modelSelect.value = state.config.model;
    } else if (modelSelect.options.length > 0) {
      modelSelect.value = modelSelect.options[0].value;
    }

    loadModelsBtn.textContent = 'Charger modèles';
    loadModelsBtn.disabled = false;

  } catch (error) {
    alert(`Erreur lors du chargement des modèles: ${error.message}`);
    loadModelsBtn.textContent = 'Charger modèles';
    loadModelsBtn.disabled = false;
  }
}

/**
 * Affiche l'historique des logs
 */
async function showLogs() {
  try {
    logsList.innerHTML = '<div class="text-center text-muted">Chargement...</div>';

    const logs = await fetchLogs();

    logsList.innerHTML = '';

    if (logs.length === 0) {
      logsList.innerHTML = '<div class="text-center text-muted">Aucun log disponible</div>';
      return;
    }

    logs.forEach(log => {
      const div = document.createElement('div');
      div.className = 'log-entry';

      const actionBadge = log.action === 'create'
        ? '<span class="badge bg-success">Création</span>'
        : '<span class="badge bg-primary">Modification</span>';

      div.innerHTML = `
        <div class="log-header">
          <strong>${log.path}</strong>
          ${actionBadge}
        </div>
        <div class="log-meta">
          ${log.timestamp} • ${log.size_after} octets
          ${log.diff ? ` • ${log.diff.lines_after} lignes` : ''}
        </div>
      `;

      logsList.appendChild(div);
    });

  } catch (error) {
    logsList.innerHTML = `<div class="text-danger text-center">Erreur: ${error.message}</div>`;
  }
}

/**
 * Initialise les événements globaux
 */
function initEvents() {
  // Paramètres
  settingsBtn.addEventListener('click', () => {
    loadSettingsToUI();
    settingsModal.showModal();
  });

  cancelSettings.addEventListener('click', () => {
    settingsModal.close();
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });

  loadModelsBtn.addEventListener('click', loadModels);

  // Auto-load models si clé présente
  apiKeyInput.addEventListener('change', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      loadModels();
    }
  });

  // Changement de thème en temps réel
  themeSelect.addEventListener('change', () => {
    state.config.theme = themeSelect.value;
    applyTheme();
  });

  editorThemeSelect.addEventListener('change', () => {
    setEditorTheme(editorThemeSelect.value);
  });

  // Logs
  logsBtn.addEventListener('click', () => {
    logsModal.showModal();
    showLogs();
  });

  closeLogs.addEventListener('click', () => {
    logsModal.close();
  });
}

/**
 * Initialisation de l'application
 */
function init() {
  console.log('🚀 Éditeur IA - Initialisation...');

  // Initialiser l'état
  initState();

  // Initialiser tous les modules
  initFileExplorer();
  initFileManager();
  initEditorEvents();
  initDiff();
  initChat();
  initEvents();

  console.log('✅ Éditeur IA - Prêt');
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', init);
