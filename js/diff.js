/**
 * Diff System - Visualisation et validation des modifications
 */

import { state } from './state.js';
import { setEditorContent } from './editor.js';

const diffViewer = document.getElementById('diffViewer');
const diffContent = document.getElementById('diffContent');
const acceptBtn = document.getElementById('acceptDiff');
const rejectBtn = document.getElementById('rejectDiff');

/**
 * Calcule le diff ligne par ligne entre deux versions
 */
function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff = [];

  const maxLength = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      // Ligne ajoutée
      diff.push({ type: 'add', line: i + 1, content: newLine });
    } else if (newLine === undefined) {
      // Ligne supprimée
      diff.push({ type: 'delete', line: i + 1, content: oldLine });
    } else if (oldLine !== newLine) {
      // Ligne modifiée (montrer les deux)
      diff.push({ type: 'delete', line: i + 1, content: oldLine });
      diff.push({ type: 'add', line: i + 1, content: newLine });
    } else {
      // Ligne inchangée (contexte)
      diff.push({ type: 'context', line: i + 1, content: oldLine });
    }
  }

  return diff;
}

/**
 * Rend le diff dans l'interface
 */
function renderDiff(diff) {
  diffContent.innerHTML = '';

  diff.forEach((change, index) => {
    const div = document.createElement('div');
    div.className = `diff-line ${change.type}`;

    let prefix = ' ';
    if (change.type === 'add') prefix = '+';
    if (change.type === 'delete') prefix = '-';

    div.textContent = `${prefix} ${change.content || ''}`;
    diffContent.appendChild(div);

    // Limiter le contexte affiché
    if (change.type === 'context') {
      // Montrer seulement 2 lignes de contexte autour des changements
      const hasChangeBefore = diff[index - 1]?.type !== 'context';
      const hasChangeAfter = diff[index + 1]?.type !== 'context';

      if (!hasChangeBefore && !hasChangeAfter) {
        div.style.display = 'none';
      }
    }
  });
}

/**
 * Affiche le diff pour validation
 * @param {string} originalContent - Contenu original
 * @param {string} newContent - Nouveau contenu proposé
 */
export function showDiff(originalContent, newContent) {
  const diff = computeDiff(originalContent, newContent);

  // Sauvegarder pour accepter/refuser
  state.pendingDiff = {
    original: originalContent,
    new: newContent,
    diff,
  };

  renderDiff(diff);
  diffViewer.style.display = 'flex';
  state.diffVisible = true;
}

/**
 * Cache le diff
 */
export function hideDiff() {
  diffViewer.style.display = 'none';
  state.diffVisible = false;
  state.pendingDiff = null;
}

/**
 * Accepte les modifications proposées
 */
function acceptDiff() {
  if (!state.pendingDiff) return;

  // Appliquer le nouveau contenu dans l'éditeur
  setEditorContent(state.pendingDiff.new);

  hideDiff();

  // Notification
  showTempMessage('Modifications acceptées', 'success');
}

/**
 * Refuse les modifications proposées
 */
function rejectDiff() {
  if (!state.pendingDiff) return;

  hideDiff();

  // Notification
  showTempMessage('Modifications refusées', 'info');
}

/**
 * Message temporaire
 */
function showTempMessage(message, type) {
  // Créer un toast temporaire
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
 * Initialise les événements du système de diff
 */
export function initDiff() {
  acceptBtn.addEventListener('click', acceptDiff);
  rejectBtn.addEventListener('click', rejectDiff);
}
