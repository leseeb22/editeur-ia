/**
 * Editor Module - Gestion de CodeMirror
 */

import { state } from './state.js';
import { readFile, writeFile } from './api.js';

const editorContainer = document.getElementById('editorContainer');
const fileNameEl = document.getElementById('currentFileName');
const fileStatusEl = document.getElementById('fileStatus');
const saveBtn = document.getElementById('saveBtn');
const closeFileBtn = document.getElementById('closeFileBtn');

let editor = null;

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
    if (state.currentFile && !state.fileModified) {
      state.fileModified = true;
      updateFileStatus();
    }
  });

  state.editorInstance = editor;
}

/**
 * Met à jour le statut du fichier dans l'en-tête
 */
function updateFileStatus() {
  if (state.fileModified) {
    fileStatusEl.textContent = 'Modifié';
    fileStatusEl.className = 'file-status modified';
    saveBtn.disabled = false;
  } else {
    fileStatusEl.textContent = 'Sauvegardé';
    fileStatusEl.className = 'file-status';
    saveBtn.disabled = true;
  }
}

/**
 * Ouvre un fichier dans l'éditeur
 */
export async function openFile(path) {
  try {
    const fileData = await readFile(path);

    state.currentFile = fileData;
    state.currentFilePath = path;
    state.fileModified = false;

    // Initialiser l'éditeur si nécessaire
    if (!editor) {
      initEditor();
    }

    // Charger le contenu
    editor.setValue(fileData.content);

    // Définir le mode
    const mode = getModeByExtension(path);
    editor.setOption('mode', mode);

    // Mettre à jour l'interface
    fileNameEl.textContent = path;
    updateFileStatus();
    closeFileBtn.disabled = false;

  } catch (error) {
    throw error;
  }
}

/**
 * Sauvegarde le fichier actuel
 */
export async function saveCurrentFile() {
  if (!state.currentFile || !editor) {
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Sauvegarde...';

    const content = editor.getValue();
    await writeFile(state.currentFilePath, content, 'modify');

    state.currentFile.content = content;
    state.fileModified = false;

    updateFileStatus();
    saveBtn.textContent = 'Sauvegarder';

    // Notification
    showNotification('Fichier sauvegardé avec succès', 'success');

  } catch (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Sauvegarder';
    alert(`Erreur lors de la sauvegarde: ${error.message}`);
  }
}

/**
 * Ferme le fichier actuel
 */
export function closeCurrentFile() {
  if (state.fileModified) {
    if (!confirm('Le fichier a été modifié. Fermer sans sauvegarder ?')) {
      return;
    }
  }

  state.currentFile = null;
  state.currentFilePath = null;
  state.fileModified = false;

  if (editor) {
    editor.setValue('');
  }

  fileNameEl.textContent = 'Aucun fichier ouvert';
  fileStatusEl.textContent = '';
  saveBtn.disabled = true;
  closeFileBtn.disabled = true;

  // Retirer la sélection active
  document.querySelectorAll('.file-item.active').forEach(el => {
    el.classList.remove('active');
  });
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
    editor.setValue(content);
    state.fileModified = true;
    updateFileStatus();
  }
}

/**
 * Notification temporaire
 */
function showNotification(message, type = 'info') {
  // Simple notification dans le statut
  const original = fileStatusEl.textContent;
  fileStatusEl.textContent = message;
  fileStatusEl.className = `file-status ${type}`;

  setTimeout(() => {
    updateFileStatus();
  }, 3000);
}

/**
 * Initialise les événements de l'éditeur
 */
export function initEditorEvents() {
  saveBtn.addEventListener('click', saveCurrentFile);
  closeFileBtn.addEventListener('click', closeCurrentFile);

  // Raccourci Ctrl+S pour sauvegarder
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (state.currentFile && state.fileModified) {
        saveCurrentFile();
      }
    }
  });
}
