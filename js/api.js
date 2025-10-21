/**
 * API Client - Communication avec le backend PHP
 */

const API_BASE = './api';

/**
 * Liste tous les fichiers du répertoire page/
 */
export async function fetchFiles() {
  const response = await fetch(`${API_BASE}/files.php`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de la récupération des fichiers');
  }

  return data.files;
}

/**
 * Lit le contenu d'un fichier
 * @param {string} path - Chemin relatif du fichier
 */
export async function readFile(path) {
  const response = await fetch(`${API_BASE}/read.php?path=${encodeURIComponent(path)}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de la lecture du fichier');
  }

  return {
    path: data.path,
    content: data.content,
    size: data.size,
    modified: data.modified,
  };
}

/**
 * Sauvegarde un fichier
 * @param {string} path - Chemin relatif du fichier
 * @param {string} content - Contenu à sauvegarder
 * @param {string} action - Type d'action (create|modify)
 */
export async function writeFile(path, content, action = 'modify') {
  const response = await fetch(`${API_BASE}/write.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      content,
      action,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de la sauvegarde du fichier');
  }

  return data;
}

/**
 * Récupère l'historique des modifications
 * @param {string} path - Chemin relatif du fichier (optionnel)
 */
export async function fetchLogs(path = null) {
  const url = path
    ? `${API_BASE}/logs.php?path=${encodeURIComponent(path)}`
    : `${API_BASE}/logs.php`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de la récupération des logs');
  }

  return data.logs;
}

/**
 * Appel à l'API OpenRouter pour le chat IA
 * @param {Array} messages - Historique des messages
 * @param {string} apiKey - Clé API OpenRouter
 * @param {string} model - Modèle à utiliser
 * @param {AbortSignal} signal - Signal d'annulation
 */
export async function chatCompletion(messages, apiKey, model, signal) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Éditeur IA',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || 'Erreur API');
  }

  return response;
}

/**
 * Récupère la liste des modèles disponibles
 * @param {string} apiKey - Clé API OpenRouter
 */
export async function fetchModels(apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Title': 'Éditeur IA',
    },
  });

  if (!response.ok) {
    throw new Error('Impossible de charger les modèles');
  }

  const data = await response.json();
  return (data.data || []).filter(m => !m.archived);
}

/**
 * Crée un nouveau fichier
 * @param {string} path - Chemin relatif du fichier
 * @param {string} template - Template à utiliser (html|php|css|js|blank)
 */
export async function createFile(path, template = 'blank') {
  const response = await fetch(`${API_BASE}/create.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      template,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de la création du fichier');
  }

  return data;
}

/**
 * Upload un fichier
 * @param {File} file - Fichier à uploader
 * @param {string} folder - Dossier de destination (optionnel)
 */
export async function uploadFile(file, folder = '') {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch(`${API_BASE}/upload.php`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de l\'upload du fichier');
  }

  return data;
}
