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

  // Arborescence des fichiers
  files: [],

  // Gestion des fichiers ouverts (onglets)
  openFiles: [], // [{path, content, modified, originalContent}]
  activeFileIndex: -1, // Index du fichier actif dans openFiles

  // Chat
  messages: [],
  chatStreaming: false,
  currentAbort: null,

  // Diff
  pendingDiff: null,
  diffVisible: false,

  // Editor instance (sera défini par editor.js)
  editorInstance: null,

  // Mode agent
  agentMode: false,
  agentPlan: null,
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

/**
 * Retourne le fichier actif
 */
export function getActiveFile() {
  if (state.activeFileIndex >= 0 && state.activeFileIndex < state.openFiles.length) {
    return state.openFiles[state.activeFileIndex];
  }
  return null;
}

/**
 * Trouve l'index d'un fichier ouvert par son chemin
 */
export function findFileIndex(path) {
  return state.openFiles.findIndex(f => f.path === path);
}
