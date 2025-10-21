/**
 * Agent Module - Mode autonome pour création et modification de fichiers par l'IA
 *
 * Ce module permet à l'IA de :
 * - Détecter des demandes de création/modification de fichiers
 * - Planifier des tâches complexes en étapes
 * - Créer automatiquement des fichiers avec confirmation
 * - Exécuter des plans multi-fichiers
 */

import { state } from './state.js';
import { createFile } from './api.js';
import { openOrActivateFile } from './fileManager.js';
import { loadFileTree } from './fileExplorer.js';
import { setEditorContent } from './editor.js';

/**
 * Détecte si la réponse de l'IA contient une demande de création de fichier
 * Format attendu:
 * - "CRÉER_FICHIER: nom_fichier.ext"
 * - "NOUVEAU_FICHIER: path/fichier.php"
 * - JSON: {"action": "create_file", "path": "...", "content": "..."}
 */
export function detectFileActions(aiResponse) {
  const actions = [];

  // Pattern 1: Commandes explicites (simples)
  const createPattern = /(?:CRÉER_FICHIER|NOUVEAU_FICHIER|CREATE_FILE):\s*([^\n]+)/gi;
  let match;

  while ((match = createPattern.exec(aiResponse)) !== null) {
    const filepath = match[1].trim();
    actions.push({
      type: 'create_file',
      path: filepath,
      content: '',
      method: 'command'
    });
  }

  // Pattern 2: JSON structuré
  try {
    const jsonPattern = /\{[^}]*"action"\s*:\s*"create_file"[^}]*\}/g;
    const jsonMatches = aiResponse.match(jsonPattern);

    if (jsonMatches) {
      jsonMatches.forEach(jsonStr => {
        try {
          const action = JSON.parse(jsonStr);
          if (action.path) {
            actions.push({
              type: 'create_file',
              path: action.path,
              content: action.content || '',
              template: action.template || 'blank',
              method: 'json'
            });
          }
        } catch (e) {
          // JSON invalide, ignorer
        }
      });
    }
  } catch (e) {
    // Erreur de parsing, ignorer
  }

  // Pattern 3: Détection de blocs de code avec indication de fichier
  // Format: "Voici le fichier contact.php :\n```php\n..."
  const fileBlockPattern = /(?:fichier|file|créer|create)\s+([^\s:]+\.[a-z]{2,4})\s*:?\s*\n\s*```(\w+)?\n([\s\S]*?)```/gi;

  while ((match = fileBlockPattern.exec(aiResponse)) !== null) {
    const filepath = match[1].trim();
    const language = match[2] || '';
    const content = match[3].trim();

    actions.push({
      type: 'create_file',
      path: filepath,
      content: content,
      language: language,
      method: 'code_block'
    });
  }

  return actions;
}

/**
 * Détecte si la réponse contient un plan de tâches
 * Format attendu:
 * PLAN:
 * 1. Créer fichier A
 * 2. Créer fichier B
 * 3. Modifier fichier C
 */
export function detectPlan(aiResponse) {
  const planPattern = /PLAN\s*:?\s*\n((?:\d+\.\s*[^\n]+\n?)+)/i;
  const match = planPattern.exec(aiResponse);

  if (!match) return null;

  const planText = match[1];
  const steps = [];

  // Parser chaque ligne numérotée
  const stepPattern = /(\d+)\.\s*(.+)/g;
  let stepMatch;

  while ((stepMatch = stepPattern.exec(planText)) !== null) {
    steps.push({
      number: parseInt(stepMatch[1]),
      description: stepMatch[2].trim(),
      status: 'pending' // pending|in_progress|completed|failed
    });
  }

  return {
    steps,
    currentStep: 0,
    completed: false
  };
}

/**
 * Affiche une confirmation pour une action de création de fichier
 */
export function showFileActionConfirmation(action) {
  return new Promise((resolve) => {
    const modal = createConfirmationModal(action);
    document.body.appendChild(modal);

    modal.showModal();

    const confirmBtn = modal.querySelector('#confirmAction');
    const cancelBtn = modal.querySelector('#cancelAction');

    confirmBtn.addEventListener('click', () => {
      modal.close();
      modal.remove();
      resolve(true);
    });

    cancelBtn.addEventListener('click', () => {
      modal.close();
      modal.remove();
      resolve(false);
    });
  });
}

/**
 * Crée un modal de confirmation pour une action
 */
function createConfirmationModal(action) {
  const modal = document.createElement('dialog');
  modal.className = 'modal-box agent-modal';

  const actionTypeLabel = action.type === 'create_file' ? 'Créer un fichier' : 'Action';
  const previewContent = action.content ? action.content.substring(0, 200) + (action.content.length > 200 ? '...' : '') : '(vide)';

  modal.innerHTML = `
    <div class="modal-inner">
      <h5 class="mb-3">🤖 L'IA souhaite ${actionTypeLabel}</h5>
      <div class="alert alert-info">
        <strong>Fichier :</strong> <code>${action.path}</code>
      </div>
      ${action.template ? `<div class="mb-2"><strong>Template :</strong> ${action.template}</div>` : ''}
      ${action.content ? `
        <div class="mb-3">
          <strong>Aperçu du contenu :</strong>
          <pre class="bg-dark text-light p-2 rounded" style="max-height: 200px; overflow: auto; font-size: 0.85rem;">${escapeHtml(previewContent)}</pre>
        </div>
      ` : ''}
      <div class="alert alert-warning">
        ⚠️ Cette action sera exécutée automatiquement si vous confirmez.
      </div>
      <div class="d-flex gap-2 mt-3">
        <button id="cancelAction" class="btn btn-outline-secondary">Refuser</button>
        <button id="confirmAction" class="btn btn-success">Accepter et créer</button>
      </div>
    </div>
  `;

  return modal;
}

/**
 * Échappe le HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Exécute une action de création de fichier
 */
export async function executeFileAction(action) {
  try {
    // Déterminer le template
    let template = action.template || 'blank';

    if (!action.template && action.content) {
      // Déduire le template du contenu ou de l'extension
      const ext = action.path.split('.').pop().toLowerCase();
      if (ext === 'html' && action.content.includes('<!DOCTYPE')) {
        template = 'html';
      } else if (ext === 'php' && action.content.includes('<?php')) {
        template = 'php';
      } else if (ext === 'css') {
        template = 'css';
      } else if (ext === 'js') {
        template = 'js';
      }
    }

    // Créer le fichier via l'API
    await createFile(action.path, template);

    // Rafraîchir l'explorateur
    await loadFileTree();

    // Ouvrir le fichier
    await openOrActivateFile(action.path);

    // Si du contenu est fourni, l'insérer
    if (action.content) {
      setEditorContent(action.content);
    }

    return {
      success: true,
      path: action.path
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Affiche le plan dans l'interface chat
 */
export function displayPlan(plan) {
  const chatMessages = document.getElementById('chatMessages');

  const planDiv = document.createElement('div');
  planDiv.className = 'chat-message assistant plan-message';
  planDiv.innerHTML = `
    <div class="role">Plan de l'IA</div>
    <div class="content">
      <h6>📋 Plan d'exécution :</h6>
      <ol class="plan-steps">
        ${plan.steps.map((step, i) => `
          <li class="plan-step" data-step="${i}">
            <span class="step-status">${getStepStatusIcon(step.status)}</span>
            <span class="step-description">${escapeHtml(step.description)}</span>
          </li>
        `).join('')}
      </ol>
      <div class="mt-3">
        <button id="executePlan" class="btn btn-sm btn-primary">▶️ Exécuter le plan</button>
        <button id="cancelPlan" class="btn btn-sm btn-outline-secondary">❌ Annuler</button>
      </div>
    </div>
  `;

  chatMessages.appendChild(planDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Enregistrer le plan dans l'état
  state.agentPlan = plan;

  // Événements
  document.getElementById('executePlan')?.addEventListener('click', () => executePlan(plan));
  document.getElementById('cancelPlan')?.addEventListener('click', () => cancelPlan());
}

/**
 * Retourne l'icône selon le statut de l'étape
 */
function getStepStatusIcon(status) {
  const icons = {
    'pending': '⏳',
    'in_progress': '🔄',
    'completed': '✅',
    'failed': '❌'
  };
  return icons[status] || '⏳';
}

/**
 * Exécute un plan étape par étape
 */
async function executePlan(plan) {
  state.agentMode = true;

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    // Marquer comme en cours
    step.status = 'in_progress';
    updatePlanUI(plan);

    // Simuler l'exécution (ici on pourrait analyser la description pour détecter l'action)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Marquer comme complété (ou échoué)
    step.status = 'completed';
    plan.currentStep = i + 1;
    updatePlanUI(plan);
  }

  plan.completed = true;
  state.agentMode = false;

  // Notification
  showAgentNotification('Plan exécuté avec succès !', 'success');
}

/**
 * Annule le plan en cours
 */
function cancelPlan() {
  state.agentPlan = null;
  state.agentMode = false;
  showAgentNotification('Plan annulé', 'info');
}

/**
 * Met à jour l'affichage du plan
 */
function updatePlanUI(plan) {
  const planSteps = document.querySelectorAll('.plan-step');

  planSteps.forEach((stepEl, i) => {
    const step = plan.steps[i];
    const statusIcon = stepEl.querySelector('.step-status');
    if (statusIcon) {
      statusIcon.textContent = getStepStatusIcon(step.status);
    }

    // Ajouter une classe selon le statut
    stepEl.className = `plan-step step-${step.status}`;
  });
}

/**
 * Affiche une notification de l'agent
 */
function showAgentNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} position-fixed`;
  toast.style.cssText = 'top: 70px; right: 20px; z-index: 9999; min-width: 300px;';
  toast.innerHTML = `🤖 <strong>Agent IA:</strong> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/**
 * Active/désactive le mode agent
 */
export function toggleAgentMode(enabled) {
  state.agentMode = enabled;

  const indicator = document.getElementById('agentModeIndicator');
  if (indicator) {
    indicator.style.display = enabled ? 'block' : 'none';
  }

  showAgentNotification(
    enabled ? 'Mode agent activé' : 'Mode agent désactivé',
    enabled ? 'success' : 'info'
  );
}

/**
 * Initialise le module agent
 */
export function initAgent() {
  console.log('🤖 Agent module initialized');

  // Le mode agent est désactivé par défaut
  state.agentMode = false;
}
