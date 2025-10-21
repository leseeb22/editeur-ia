/**
 * Chat Module - Gestion du chat IA avec détection des modifications de code
 */

import { state } from './state.js';
import { chatCompletion } from './api.js';
import { getEditorContent } from './editor.js';
import { showDiff } from './diff.js';

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const clearChatBtn = document.getElementById('clearChat');

/**
 * Ajoute un message dans le chat
 */
function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;

  const roleName = role === 'user' ? 'Vous' : 'Assistant IA';

  div.innerHTML = `
    <div class="role">${roleName}</div>
    <div class="content">${escapeHtml(content)}</div>
  `;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return div;
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
 * Crée un placeholder pour le message de l'assistant
 */
function createAssistantPlaceholder() {
  const div = document.createElement('div');
  div.className = 'chat-message assistant';
  div.innerHTML = `
    <div class="role">Assistant IA</div>
    <div class="content"><em>Réflexion en cours...</em></div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const contentEl = div.querySelector('.content');
  return { div, contentEl };
}

/**
 * Parse le contenu pour détecter les blocs de code
 * Format attendu: ```language\ncode\n```
 */
function parseCodeBlocks(text) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      fullMatch: match[0],
    });
  }

  return blocks;
}

/**
 * Construit le prompt système intelligent
 */
function buildSystemPrompt() {
  const hasFile = !!state.currentFile;
  const fileName = state.currentFilePath || 'aucun fichier';

  let prompt = `Tu es un assistant de programmation expert. `;

  if (hasFile) {
    prompt += `L'utilisateur édite actuellement le fichier "${fileName}". `;
    prompt += `Quand tu proposes des modifications de code, utilise TOUJOURS des blocs de code avec triple backticks (\`\`\`). `;
    prompt += `Exemple: \`\`\`php\n<?php echo "Hello"; ?>\n\`\`\`\n\n`;
    prompt += `Le système détectera automatiquement ces blocs et proposera une visualisation diff à l'utilisateur. `;
    prompt += `Si l'utilisateur demande de modifier le code, fournis le code complet du fichier dans un bloc.`;
  } else {
    prompt += `Aucun fichier n'est ouvert. Tu peux aider l'utilisateur avec des questions générales ou l'inviter à ouvrir un fichier.`;
  }

  return prompt;
}

/**
 * Envoie un message au chat IA
 */
async function sendMessage(text) {
  if (!state.config.apiKey) {
    alert('Veuillez configurer votre clé API dans les paramètres');
    return;
  }

  // Ajouter le message utilisateur
  state.messages.push({ role: 'user', content: text });
  addMessage('user', text);

  // Désactiver l'envoi
  sendBtn.disabled = true;
  stopBtn.disabled = false;
  chatInput.value = '';

  // Placeholder assistant
  const { div: assistantDiv, contentEl } = createAssistantPlaceholder();

  // Préparer les messages avec contexte
  const systemPrompt = buildSystemPrompt();
  const contextMessage = state.currentFile
    ? `\n\n[Fichier actuel: ${state.currentFilePath}]\n\`\`\`\n${getEditorContent()}\n\`\`\``
    : '';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...state.messages.map((msg, idx) => {
      // Ajouter le contexte du fichier uniquement au premier message user
      if (idx === 0 && msg.role === 'user' && contextMessage) {
        return { ...msg, content: msg.content + contextMessage };
      }
      return msg;
    }),
  ];

  // Controller pour annulation
  const controller = new AbortController();
  state.currentAbort = controller;

  let fullResponse = '';

  try {
    const response = await chatCompletion(
      messages,
      state.config.apiKey,
      state.config.model,
      controller.signal
    );

    // Lecture du stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;

          const data = line.slice(5).trim();
          if (data === '[DONE]') break;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              fullResponse += delta.content;
              contentEl.textContent = fullResponse;
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }

    // Sauvegarder la réponse
    state.messages.push({ role: 'assistant', content: fullResponse });

    // Détecter les blocs de code
    const codeBlocks = parseCodeBlocks(fullResponse);

    if (codeBlocks.length > 0 && state.currentFile) {
      // Proposer le diff pour le premier bloc de code trouvé
      const firstBlock = codeBlocks[0];
      const originalContent = getEditorContent();

      // Ajouter un bouton pour voir le diff
      const diffBtn = document.createElement('button');
      diffBtn.className = 'btn btn-sm btn-primary mt-2';
      diffBtn.textContent = `Voir les modifications proposées (${codeBlocks.length} bloc${codeBlocks.length > 1 ? 's' : ''})`;
      diffBtn.onclick = () => {
        showDiff(originalContent, firstBlock.code);
      };

      assistantDiv.appendChild(diffBtn);
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      contentEl.textContent = fullResponse || '(Arrêté)';
    } else {
      contentEl.textContent = `Erreur: ${error.message}`;
    }
  } finally {
    sendBtn.disabled = false;
    stopBtn.disabled = true;
    state.currentAbort = null;
  }
}

/**
 * Efface l'historique du chat
 */
function clearChat() {
  if (!confirm('Effacer tout l\'historique du chat ?')) return;

  state.messages = [];
  chatMessages.innerHTML = '';
}

/**
 * Auto-resize du textarea
 */
function autoResize() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(150, Math.max(40, chatInput.scrollHeight)) + 'px';
}

/**
 * Initialise le chat
 */
export function initChat() {
  // Envoi du formulaire
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  // Shift+Enter pour nouvelle ligne, Enter pour envoyer
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  // Auto-resize
  chatInput.addEventListener('input', autoResize);
  autoResize();

  // Bouton stop
  stopBtn.addEventListener('click', () => {
    state.currentAbort?.abort();
    stopBtn.disabled = true;
  });

  // Bouton clear
  clearChatBtn.addEventListener('click', clearChat);

  // Message de bienvenue
  addMessage('assistant', 'Bonjour ! Je suis votre assistant IA pour l\'édition de code. Ouvrez un fichier et demandez-moi de vous aider à le modifier.');
}
