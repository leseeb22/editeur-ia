/**
 * File Manager - Gestion des onglets et fichiers multiples
 */

import { state, getActiveFile, findFileIndex } from './state.js';
import { createFile, uploadFile } from './api.js';
import { readFile } from './api.js';
import { loadFileTree } from './fileExplorer.js';

const tabsContainer = document.getElementById('tabsContainer');
const newFileBtn = document.getElementById('newFileBtn');
const uploadFileBtn = document.getElementById('uploadFileBtn');
const newFileModal = document.getElementById('newFileModal');
const uploadModal = document.getElementById('uploadModal');
const newFileForm = document.getElementById('newFileForm');
const uploadForm = document.getElementById('uploadForm');

/**
 * Icônes selon l'extension
 */
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'php': '🐘',
    'html': '🌐',
    'htm': '🌐',
    'css': '🎨',
    'js': '⚡',
    'json': '📋',
    'txt': '📄',
    'md': '📝',
  };
  return icons[ext] || '📄';
}

/**
 * Crée un onglet pour un fichier
 */
function createTab(path, index) {
  const filename = path.split('/').pop();
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.index = index;
  tab.dataset.path = path;

  tab.innerHTML = `
    <span class="tab-icon">${getFileIcon(filename)}</span>
    <span class="tab-name" title="${path}">${filename}</span>
    <span class="tab-modified"></span>
    <span class="tab-close" title="Fermer">×</span>
  `;

  // Clic sur l'onglet = activer le fichier
  tab.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      switchToTab(index);
    }
  });

  // Clic sur la croix = fermer l'onglet
  const closeBtn = tab.querySelector('.tab-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(index);
  });

  return tab;
}

/**
 * Rafraîchit l'affichage des onglets
 */
export function renderTabs() {
  tabsContainer.innerHTML = '';

  state.openFiles.forEach((file, index) => {
    const tab = createTab(file.path, index);

    // Marquer l'onglet actif
    if (index === state.activeFileIndex) {
      tab.classList.add('active');
    }

    // Marquer comme modifié
    if (file.modified) {
      tab.classList.add('modified');
    }

    tabsContainer.appendChild(tab);
  });
}

/**
 * Bascule vers un onglet spécifique
 */
export function switchToTab(index) {
  if (index < 0 || index >= state.openFiles.length) return;

  state.activeFileIndex = index;
  renderTabs();

  // Notifier editor.js pour qu'il charge le fichier
  window.dispatchEvent(new CustomEvent('file-switched', { detail: { index } }));
}

/**
 * Ferme un onglet
 */
export function closeTab(index) {
  const file = state.openFiles[index];

  if (file.modified) {
    if (!confirm(`Le fichier ${file.path} a des modifications non sauvegardées. Fermer quand même ?`)) {
      return;
    }
  }

  // Retirer le fichier
  state.openFiles.splice(index, 1);

  // Ajuster l'index actif
  if (state.openFiles.length === 0) {
    state.activeFileIndex = -1;
  } else if (state.activeFileIndex >= state.openFiles.length) {
    state.activeFileIndex = state.openFiles.length - 1;
  }

  renderTabs();

  // Notifier editor.js
  window.dispatchEvent(new CustomEvent('file-closed', { detail: { index } }));
}

/**
 * Ouvre ou active un fichier
 * @param {string} path - Chemin du fichier
 */
export async function openOrActivateFile(path) {
  // Vérifier si le fichier est déjà ouvert
  const existingIndex = findFileIndex(path);

  if (existingIndex !== -1) {
    // Le fichier est déjà ouvert, basculer vers son onglet
    switchToTab(existingIndex);
    return;
  }

  // Charger le fichier
  try {
    const fileData = await readFile(path);

    const newFile = {
      path: path,
      content: fileData.content,
      originalContent: fileData.content,
      modified: false,
    };

    state.openFiles.push(newFile);
    state.activeFileIndex = state.openFiles.length - 1;

    renderTabs();

    // Notifier editor.js
    window.dispatchEvent(new CustomEvent('file-opened', {
      detail: { index: state.activeFileIndex, file: newFile }
    }));

  } catch (error) {
    alert(`Erreur lors de l'ouverture du fichier: ${error.message}`);
  }
}

/**
 * Marque le fichier actif comme modifié
 */
export function markActiveFileModified(modified = true) {
  const file = getActiveFile();
  if (file) {
    file.modified = modified;
    renderTabs();
  }
}

/**
 * Met à jour le contenu du fichier actif
 */
export function updateActiveFileContent(content) {
  const file = getActiveFile();
  if (file) {
    file.content = content;
    file.modified = (content !== file.originalContent);
    renderTabs();
  }
}

/**
 * Marque le fichier actif comme sauvegardé
 */
export function markActiveFileSaved() {
  const file = getActiveFile();
  if (file) {
    file.originalContent = file.content;
    file.modified = false;
    renderTabs();
  }
}

/**
 * Gère la création d'un nouveau fichier
 */
async function handleNewFile(e) {
  e.preventDefault();

  const filename = document.getElementById('newFileName').value.trim();
  const folder = document.getElementById('newFileFolder').value.trim();
  const template = document.getElementById('newFileTemplate').value;

  if (!filename) {
    alert('Veuillez entrer un nom de fichier');
    return;
  }

  const path = folder ? `${folder}/${filename}` : filename;

  try {
    await createFile(path, template);

    // Rafraîchir l'explorateur
    await loadFileTree();

    // Ouvrir le nouveau fichier
    await openOrActivateFile(path);

    // Fermer le modal
    newFileModal.close();

    // Réinitialiser le formulaire
    newFileForm.reset();

  } catch (error) {
    alert(`Erreur lors de la création du fichier: ${error.message}`);
  }
}

/**
 * Gère l'upload d'un fichier
 */
async function handleUploadFile(e) {
  e.preventDefault();

  const fileInput = document.getElementById('uploadFileInput');
  const folder = document.getElementById('uploadFolder').value.trim();

  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Veuillez sélectionner un fichier');
    return;
  }

  const file = fileInput.files[0];

  try {
    const result = await uploadFile(file, folder);

    // Rafraîchir l'explorateur
    await loadFileTree();

    // Ouvrir le fichier uploadé
    await openOrActivateFile(result.path);

    // Fermer le modal
    uploadModal.close();

    // Réinitialiser le formulaire
    uploadForm.reset();

  } catch (error) {
    alert(`Erreur lors de l'upload: ${error.message}`);
  }
}

/**
 * Ferme tous les fichiers
 */
export function closeAllFiles() {
  const hasModified = state.openFiles.some(f => f.modified);

  if (hasModified) {
    if (!confirm('Certains fichiers ont des modifications non sauvegardées. Tout fermer quand même ?')) {
      return;
    }
  }

  state.openFiles = [];
  state.activeFileIndex = -1;
  renderTabs();

  window.dispatchEvent(new CustomEvent('all-files-closed'));
}

/**
 * Initialise le gestionnaire de fichiers
 */
export function initFileManager() {
  // Boutons d'action
  newFileBtn.addEventListener('click', () => {
    newFileModal.showModal();
  });

  uploadFileBtn.addEventListener('click', () => {
    uploadModal.showModal();
  });

  // Fermeture des modals
  document.getElementById('cancelNewFile').addEventListener('click', () => {
    newFileModal.close();
  });

  document.getElementById('cancelUpload').addEventListener('click', () => {
    uploadModal.close();
  });

  // Soumission des formulaires
  newFileForm.addEventListener('submit', handleNewFile);
  uploadForm.addEventListener('submit', handleUploadFile);

  // Écouter les demandes de fermeture d'onglet
  window.addEventListener('close-tab-request', (e) => {
    closeTab(e.detail.index);
  });
}
