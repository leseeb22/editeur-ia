/**
 * File Explorer - Gestion de l'arborescence des fichiers
 */

import { state } from './state.js';
import { fetchFiles } from './api.js';
import { openOrActivateFile } from './fileManager.js';

const fileTreeEl = document.getElementById('fileTree');
const refreshBtn = document.getElementById('refreshFiles');

/**
 * Icônes selon le type de fichier
 */
function getFileIcon(extension) {
  const icons = {
    'php': '🐘',
    'html': '🌐',
    'css': '🎨',
    'js': '⚡',
    'json': '📋',
    'txt': '📄',
    'md': '📝',
  };
  return icons[extension] || '📄';
}

/**
 * Rend un élément de fichier
 */
function renderFileItem(file, depth = 0) {
  const div = document.createElement('div');
  div.style.paddingLeft = `${depth * 16}px`;

  if (file.type === 'directory') {
    div.className = 'folder-item';
    div.innerHTML = `
      <span class="folder-icon">📁</span>
      <span>${file.name}</span>
    `;

    // Conteneur pour les enfants
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'folder-children';
    childrenContainer.style.display = 'none';

    if (file.children && file.children.length > 0) {
      file.children.forEach(child => {
        childrenContainer.appendChild(renderFileItem(child, depth + 1));
      });
    }

    // Toggle du dossier
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = childrenContainer.style.display !== 'none';
      childrenContainer.style.display = isVisible ? 'none' : 'block';
      div.querySelector('.folder-icon').textContent = isVisible ? '📁' : '📂';
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(div);
    wrapper.appendChild(childrenContainer);
    return wrapper;

  } else {
    div.className = 'file-item';
    div.dataset.path = file.path;
    div.innerHTML = `
      <span class="file-icon">${getFileIcon(file.extension)}</span>
      <span>${file.name}</span>
    `;

    // Click sur un fichier
    div.addEventListener('click', async (e) => {
      e.stopPropagation();

      // Retirer la classe active des autres fichiers
      document.querySelectorAll('.file-item.active').forEach(el => {
        el.classList.remove('active');
      });

      // Ajouter la classe active
      div.classList.add('active');

      // Ouvrir le fichier dans l'éditeur
      try {
        await openOrActivateFile(file.path);
      } catch (error) {
        alert(`Erreur lors de l'ouverture du fichier: ${error.message}`);
      }
    });

    return div;
  }
}

/**
 * Charge et affiche l'arborescence des fichiers
 */
export async function loadFileTree() {
  try {
    fileTreeEl.innerHTML = '<div class="text-muted text-center py-3">Chargement...</div>';

    const files = await fetchFiles();
    state.files = files;

    fileTreeEl.innerHTML = '';

    if (files.length === 0) {
      fileTreeEl.innerHTML = '<div class="text-muted text-center py-3">Aucun fichier</div>';
      return;
    }

    files.forEach(file => {
      fileTreeEl.appendChild(renderFileItem(file));
    });

  } catch (error) {
    fileTreeEl.innerHTML = `<div class="text-danger text-center py-3">Erreur: ${error.message}</div>`;
  }
}

/**
 * Initialise l'explorateur de fichiers
 */
export function initFileExplorer() {
  refreshBtn.addEventListener('click', loadFileTree);
  loadFileTree();
}
