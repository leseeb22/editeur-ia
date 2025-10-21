/**
 * Chat Module - Gestion du chat IA avec détection des modifications de code et mode agent
 */

import { state } from './state.js';
import { chatCompletion, fetchFiles, readFile } from './api.js';
import { getEditorContent } from './editor.js';
import { showDiff } from './diff.js';
import { detectFileActions, detectPlan, displayPlan, showFileActionConfirmation, executeFileAction } from './agent.js';

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
 * Détecte si l'utilisateur demande d'analyser tous les fichiers du projet
 */
function detectProjectAnalysisRequest(message) {
  const lowerMsg = message.toLowerCase();
  const keywords = [
    'analyse les fichiers',
    'analyser les fichiers',
    'analyse moi les fichier', // Avec faute
    'analyser le fichier', // Variations
    'tous les fichiers',
    'liste les fichiers',
    'lister les fichiers',
    'voir les fichiers',
    'fichiers du projet',
    'projet complet',
    'analyse tout',
    'analyser tout',
    'voir tout',
    'montre tout',
    'montre les fichiers',
    'quel fichier',
    'quels fichiers',
  ];

  return keywords.some(keyword => lowerMsg.includes(keyword));
}

/**
 * Charge le contexte complet du projet (liste des fichiers avec aperçu)
 */
async function loadProjectContext() {
  try {
    const files = await fetchFiles();

    if (!files || files.length === 0) {
      return 'Le projet ne contient aucun fichier.';
    }

    let context = `\n\n[STRUCTURE DU PROJET]\n`;
    context += `Le projet contient ${files.length} fichier(s) :\n\n`;

    // Organiser les fichiers par type
    const filesByType = {};
    files.forEach(file => {
      const ext = file.name.split('.').pop() || 'autre';
      if (!filesByType[ext]) filesByType[ext] = [];
      filesByType[ext].push(file);
    });

    // Afficher la structure organisée
    for (const [ext, filesOfType] of Object.entries(filesByType)) {
      context += `📄 Fichiers .${ext} (${filesOfType.length}) :\n`;
      filesOfType.forEach(file => {
        const size = file.size ? `${Math.round(file.size / 1024)}KB` : 'N/A';
        context += `   - ${file.path} (${size})\n`;
      });
      context += '\n';
    }

    // Pour les petits projets (< 10 fichiers), charger un aperçu du contenu
    if (files.length <= 10) {
      context += `\n[APERÇU DU CONTENU]\n\n`;

      for (const file of files) {
        try {
          const fileData = await readFile(file.path);
          const lines = fileData.content.split('\n');
          const preview = lines.slice(0, 20).join('\n'); // Premiers 20 lignes
          const truncated = lines.length > 20 ? `\n... (${lines.length - 20} lignes supplémentaires)` : '';

          context += `\`\`\`${file.path}\n${preview}${truncated}\n\`\`\`\n\n`;
        } catch (error) {
          context += `${file.path} : Erreur de lecture\n\n`;
        }
      }
    } else {
      context += `\nNote : Le projet contient plus de 10 fichiers. Demandez-moi d'ouvrir un fichier spécifique pour voir son contenu.\n`;
    }

    return context;
  } catch (error) {
    return `\n\n[Erreur lors du chargement du projet : ${error.message}]`;
  }
}

/**
 * Construit le prompt système intelligent
 */
function buildSystemPrompt() {
  const hasFile = !!state.openFiles && state.openFiles.length > 0;
  const activeFile = state.openFiles[state.activeFileIndex];
  const fileName = activeFile?.path || 'aucun fichier';

  let prompt = `Tu es un assistant de programmation expert. `;

  // MODE AGENT ACTIVÉ
  if (state.agentMode) {
    prompt += `🤖 MODE AGENT ACTIVÉ\n\n`;
    prompt += `Tu peux créer des fichiers automatiquement en utilisant ces formats:\n\n`;
    prompt += `1. Format bloc de code avec indication:\n`;
    prompt += `"Voici le fichier contact.php :\n\`\`\`php\n<?php ...\n\`\`\`"\n\n`;
    prompt += `2. Format JSON structuré:\n`;
    prompt += `{"action": "create_file", "path": "contact.php", "content": "<?php ...", "template": "php"}\n\n`;
    prompt += `3. Pour les tâches complexes, fournis un PLAN:\n`;
    prompt += `PLAN:\n`;
    prompt += `1. Créer le fichier header.php\n`;
    prompt += `2. Créer le fichier footer.php\n`;
    prompt += `3. Créer le fichier index.php\n\n`;
    prompt += `L'utilisateur validera chaque action avant exécution.\n\n`;
  }

  if (hasFile) {
    prompt += `L'utilisateur édite actuellement le fichier "${fileName}". `;
    prompt += `Quand tu proposes des modifications de code, utilise TOUJOURS des blocs de code avec triple backticks (\`\`\`). `;
    prompt += `Exemple: \`\`\`php\n<?php echo "Hello"; ?>\n\`\`\`\n\n`;
    prompt += `Le système détectera automatiquement ces blocs et proposera une visualisation diff à l'utilisateur. `;
    prompt += `Si l'utilisateur demande de modifier le code, fournis le code complet du fichier dans un bloc.`;
  } else {
    prompt += `Aucun fichier n'est ouvert. `;
  }

  prompt += `\n\nPour analyser le projet complet, l'utilisateur peut dire "analyse les fichiers" ou "tous les fichiers". `;
  prompt += `Le système chargera alors automatiquement la structure du projet et le contenu des fichiers.\n\n`;

  prompt += `⚠️ IMPORTANT : Si l'utilisateur demande d'analyser les fichiers du projet :\n`;
  prompt += `- Tu DOIS utiliser UNIQUEMENT les informations fournies dans le contexte [STRUCTURE DU PROJET] et [APERÇU DU CONTENU]\n`;
  prompt += `- N'INVENTE JAMAIS de fichiers qui ne sont pas listés dans le contexte\n`;
  prompt += `- Si aucun contexte de projet n'est fourni, indique clairement qu'aucun fichier n'est disponible\n`;
  prompt += `- Base ton analyse EXCLUSIVEMENT sur les données réelles fournies`;

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

  // Détecter si l'utilisateur demande d'analyser tous les fichiers
  const needsProjectContext = detectProjectAnalysisRequest(text);

  let contextMessage = '';

  if (needsProjectContext) {
    // Charger le contexte complet du projet
    console.log('[Chat] Détection d\'analyse projet - Chargement du contexte...');
    contentEl.textContent = 'Analyse du projet en cours...';
    contextMessage = await loadProjectContext();
    console.log('[Chat] Contexte chargé:', contextMessage.substring(0, 200) + '...');
  } else if (state.currentFile) {
    // Contexte du fichier actuel uniquement
    contextMessage = `\n\n[Fichier actuel: ${state.currentFilePath}]\n\`\`\`\n${getEditorContent()}\n\`\`\``;
  }

  // Trouver le dernier message utilisateur (celui qu'on vient d'ajouter)
  const lastUserMessageIndex = state.messages.length - 1;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...state.messages.map((msg, idx) => {
      // Ajouter le contexte au dernier message utilisateur
      if (idx === lastUserMessageIndex && msg.role === 'user' && contextMessage) {
        console.log('[Chat] Ajout du contexte au message utilisateur');
        return { ...msg, content: msg.content + contextMessage };
      }
      return msg;
    }),
  ];

  // Debug: Afficher le message complet envoyé à l'IA
  if (needsProjectContext) {
    console.log('[Chat] Message final envoyé à l\'IA:', messages[messages.length - 1].content.substring(0, 500) + '...');
  }

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

    // MODE AGENT : Détecter les plans et actions
    if (state.agentMode) {
      // Détecter un plan
      const plan = detectPlan(fullResponse);
      if (plan) {
        displayPlan(plan);
        return; // Ne pas afficher les boutons de diff si c'est un plan
      }

      // Détecter des actions de fichiers
      const fileActions = detectFileActions(fullResponse);
      if (fileActions.length > 0) {
        // Proposer chaque action à l'utilisateur
        for (const action of fileActions) {
          const confirmed = await showFileActionConfirmation(action);
          if (confirmed) {
            const result = await executeFileAction(action);
            if (result.success) {
              addMessage('assistant', `✅ Fichier créé : ${result.path}`);
            } else {
              addMessage('assistant', `❌ Erreur : ${result.error}`);
            }
          }
        }
        return; // Ne pas afficher les boutons de diff
      }
    }

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

  // Toggle mode agent
  const agentToggle = document.getElementById('agentModeToggle');
  const agentIndicator = document.getElementById('agentModeIndicator');

  if (agentToggle) {
    agentToggle.addEventListener('change', (e) => {
      state.agentMode = e.target.checked;

      // Afficher/masquer l'indicateur
      if (agentIndicator) {
        agentIndicator.style.display = state.agentMode ? 'block' : 'none';
      }

      // Ajouter/retirer la classe sur body
      if (state.agentMode) {
        document.body.classList.add('agent-active');
        addMessage('assistant', '🤖 Mode Agent activé ! Je peux maintenant créer des fichiers automatiquement. Demandez-moi par exemple : "Crée un fichier contact.php avec un formulaire".');
      } else {
        document.body.classList.remove('agent-active');
        addMessage('assistant', 'Mode Agent désactivé. Je retourne au mode standard.');
      }
    });
  }

  // Message de bienvenue
  addMessage('assistant', 'Bonjour ! Je suis votre assistant IA pour l\'édition de code. Ouvrez un fichier et demandez-moi de vous aider à le modifier.\n\n💡 Activez le Mode Agent pour que je puisse créer des fichiers automatiquement !');
}
