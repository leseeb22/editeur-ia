/**
 * State Manager - Gestion centralisée de l'état de l'application
 */

export const state = {
  // Configuration
  config: {
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'openrouter/auto',
    theme: localStorage.getItem('theme') || 'system',
    editorTheme: localStorage.getItem('editorTheme') || 'dracula',
  },

  // Fichiers
  files: [],
  currentFile: null,
  currentFilePath: null,
  fileModified: false,

  // Chat
  messages: [],
  chatStreaming: false,
  currentAbort: null,

  // Diff
  pendingDiff: null,
  diffVisible: false,

  // Editor instance (sera défini par editor.js)
  editorInstance: null,
};

/**
 * Sauvegarde la configuration dans localStorage
 */
export function saveConfig() {
  localStorage.setItem('apiKey', state.config.apiKey);
  localStorage.setItem('model', state.config.model);
  localStorage.setItem('theme', state.config.theme);
  localStorage.setItem('editorTheme', state.config.editorTheme);
}

/**
 * Met à jour le thème de l'interface
 */
export function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.config.theme);
}

/**
 * Initialise l'état au démarrage
 */
export function initState() {
  applyTheme();
}
