/**
 * Editor Module - Gestion de CodeMirror avec support multi-onglets
 */

import { state, getActiveFile } from './state.js';
import { writeFile } from './api.js';
import { markActiveFileModified, markActiveFileSaved, updateActiveFileContent, closeAllFiles } from './fileManager.js';

const editorContainer = document.getElementById('editorContainer');
const fileNameEl = document.getElementById('currentFileName');
const fileStatusEl = document.getElementById('fileStatus');
const saveBtn = document.getElementById('saveBtn');
const saveAllBtn = document.getElementById('saveAllBtn');
const closeFileBtn = document.getElementById('closeFileBtn');
const closeAllBtn = document.getElementById('closeAllBtn');

let editor = null;
let changeListenerActive = true; // Pour éviter de déclencher onChange lors du chargement

/**
 * Détermine le mode CodeMirror selon l'extension
 */
function getModeByExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const modes = {
    'js': 'javascript',
    'json': 'application/json',
    'html': 'htmlmixed',
    'htm': 'htmlmixed',
    'php': 'application/x-httpd-php',
    'css': 'css',
    'xml': 'xml',
  };
  return modes[ext] || 'text/plain';
}

/**
 * Initialise CodeMirror
 */
export function initEditor() {
  // Supprimer l'état vide
  const emptyState = editorContainer.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  editor = CodeMirror(editorContainer, {
    lineNumbers: true,
    theme: state.config.editorTheme,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    autofocus: true,
  });

  // Détecter les modifications
  editor.on('change', () => {
    if (!changeListenerActive) return;

    const file = getActiveFile();
    if (file) {
      const content = editor.getValue();
      updateActiveFileContent(content);
      updateUI();
    }
  });

  state.editorInstance = editor;
}

/**
 * Met à jour l'interface (nom fichier, statut, boutons)
 */
function updateUI() {
  const file = getActiveFile();

  if (!file) {
    fileNameEl.textContent = 'Aucun fichier ouvert';
    fileStatusEl.textContent = '';
    fileStatusEl.className = 'file-status';
    saveBtn.disabled = true;
    closeFileBtn.disabled = true;
    saveAllBtn.disabled = true;
    closeAllBtn.disabled = true;
    return;
  }

  fileNameEl.textContent = file.path;

  if (file.modified) {
    fileStatusEl.textContent = 'Modifié';
    fileStatusEl.className = 'file-status modified';
    saveBtn.disabled = false;
  } else {
    fileStatusEl.textContent = 'Sauvegardé';
    fileStatusEl.className = 'file-status';
    saveBtn.disabled = true;
  }

  closeFileBtn.disabled = false;

  // Activer "Tout sauvegarder" si au moins un fichier est modifié
  const hasModified = state.openFiles.some(f => f.modified);
  saveAllBtn.disabled = !hasModified;

  // Activer "Tout fermer" s'il y a des fichiers ouverts
  closeAllBtn.disabled = state.openFiles.length === 0;
}

/**
 * Charge un fichier dans l'éditeur
 */
function loadFileInEditor(file) {
  if (!editor) {
    initEditor();
  }

  // Désactiver temporairement le listener pour éviter de marquer comme modifié
  changeListenerActive = false;

  // Charger le contenu
  editor.setValue(file.content);

  // Définir le mode
  const mode = getModeByExtension(file.path);
  editor.setOption('mode', mode);

  // Réactiver le listener
  setTimeout(() => {
    changeListenerActive = true;
  }, 100);

  updateUI();
}

/**
 * Sauvegarde le fichier actif
 */
export async function saveCurrentFile() {
  const file = getActiveFile();
  if (!file || !editor) return;

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Sauvegarde...';

    const content = editor.getValue();
    await writeFile(file.path, content, 'modify');

    file.content = content;
    markActiveFileSaved();

    updateUI();
    saveBtn.textContent = 'Sauvegarder';

    // Notification
    showNotification('Fichier sauvegardé', 'success');

  } catch (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Sauvegarder';
    alert(`Erreur lors de la sauvegarde: ${error.message}`);
  }
}

/**
 * Sauvegarde tous les fichiers modifiés
 */
async function saveAllFiles() {
  const modifiedFiles = state.openFiles.filter(f => f.modified);

  if (modifiedFiles.length === 0) return;

  try {
    saveAllBtn.disabled = true;
    saveAllBtn.textContent = `Sauvegarde ${modifiedFiles.length} fichier(s)...`;

    for (const file of modifiedFiles) {
      await writeFile(file.path, file.content, 'modify');
      file.originalContent = file.content;
      file.modified = false;
    }

    updateUI();
    saveAllBtn.textContent = 'Tout sauvegarder';

    showNotification(`${modifiedFiles.length} fichier(s) sauvegardé(s)`, 'success');

  } catch (error) {
    saveAllBtn.textContent = 'Tout sauvegarder';
    alert(`Erreur lors de la sauvegarde: ${error.message}`);
  }
}

/**
 * Change le thème de l'éditeur
 */
export function setEditorTheme(theme) {
  if (editor) {
    editor.setOption('theme', theme);
  }
  state.config.editorTheme = theme;
}

/**
 * Obtient le contenu actuel de l'éditeur
 */
export function getEditorContent() {
  return editor ? editor.getValue() : '';
}

/**
 * Définit le contenu de l'éditeur
 */
export function setEditorContent(content) {
  if (editor) {
    changeListenerActive = false;
    editor.setValue(content);

    const file = getActiveFile();
    if (file) {
      file.content = content;
      file.modified = (content !== file.originalContent);
    }

    setTimeout(() => {
      changeListenerActive = true;
    }, 100);

    updateUI();
  }
}

/**
 * Notification temporaire
 */
function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'success' ? 'success' : 'info'} position-fixed`;
  toast.style.cssText = 'top: 70px; right: 20px; z-index: 9999; min-width: 250px;';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Gestion des événements de fileManager
 */
function handleFileOpened(e) {
  const { file } = e.detail;
  loadFileInEditor(file);
}

function handleFileSwitched(e) {
  const file = getActiveFile();
  if (file) {
    loadFileInEditor(file);
  }
}

function handleFileClosed(e) {
  const file = getActiveFile();

  if (file) {
    loadFileInEditor(file);
  } else {
    // Aucun fichier ouvert
    if (editor) {
      editor.setValue('');
    }
    updateUI();
  }
}

function handleAllFilesClosed() {
  if (editor) {
    editor.setValue('');
  }
  updateUI();
}

/**
 * Initialise les événements de l'éditeur
 */
export function initEditorEvents() {
  saveBtn.addEventListener('click', saveCurrentFile);
  saveAllBtn.addEventListener('click', saveAllFiles);
  closeFileBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('close-active-tab'));
  });
  closeAllBtn.addEventListener('click', closeAllFiles);

  // Raccourci Ctrl+S pour sauvegarder
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const file = getActiveFile();
      if (file && file.modified) {
        saveCurrentFile();
      }
    }
  });

  // Écouter les événements de fileManager
  window.addEventListener('file-opened', handleFileOpened);
  window.addEventListener('file-switched', handleFileSwitched);
  window.addEventListener('file-closed', handleFileClosed);
  window.addEventListener('all-files-closed', handleAllFilesClosed);

  // Écouter la fermeture de l'onglet actif
  window.addEventListener('close-active-tab', () => {
    if (state.activeFileIndex !== -1) {
      const closeTabEvent = new CustomEvent('close-tab-request', {
        detail: { index: state.activeFileIndex }
      });
      window.dispatchEvent(closeTabEvent);
    }
  });
}
