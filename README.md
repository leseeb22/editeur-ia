# Éditeur IA - Éditeur de code assisté par IA

Éditeur de code web avec assistant IA intégré, permettant de modifier des fichiers PHP/HTML/CSS/JS avec l'aide d'un modèle de langage via OpenRouter.

## Fonctionnalités principales

### 🎯 Interface 3 zones
- **Explorateur de fichiers** (haut gauche) : Navigation dans le répertoire `page/`
- **Éditeur CodeMirror** (haut droite) : Édition de code avec coloration syntaxique
- **Chat IA** (bas) : Assistant intelligent pour proposer des modifications

### 🤖 Assistant IA intelligent
- Propose des modifications de code en temps réel
- Détection automatique des blocs de code dans les réponses
- **Système de diff visuel** : Modifications en vert (ajouts) et rouge (suppressions)
- **Validation manuelle** : Accepter ou refuser chaque modification proposée
- Contexte automatique du fichier en cours d'édition

### 📝 Éditeur de code
- CodeMirror avec support PHP, HTML, CSS, JavaScript
- Coloration syntaxique automatique selon l'extension
- Sauvegarde avec **Ctrl+S** ou bouton
- Détection des modifications non sauvegardées
- Thèmes : Dracula (sombre), Eclipse (clair)

### 📋 Journalisation complète
- Historique détaillé de toutes les modifications
- Timestamp, taille, nombre de lignes
- Diff ligne par ligne sauvegardé
- IP et User-Agent enregistrés
- Logs au format JSON dans `logs/`

## Architecture

```
editeur-ia/
├── api/                    # Backend PHP
│   ├── files.php          # Liste les fichiers
│   ├── read.php           # Lit un fichier
│   ├── write.php          # Sauvegarde + journalisation
│   └── logs.php           # Consulte l'historique
├── js/                    # Frontend modulaire
│   ├── state.js           # Gestion de l'état
│   ├── api.js             # Client API
│   ├── fileExplorer.js    # Explorateur de fichiers
│   ├── editor.js          # Gestion CodeMirror
│   ├── diff.js            # Système de diff
│   ├── chat.js            # Chat IA
│   └── app.js             # Orchestrateur
├── page/                  # Fichiers à éditer
│   └── example.php        # Fichier d'exemple
├── logs/                  # Journaux (protégés)
├── index.html             # Interface principale
├── style.css              # Styles (grille CSS)
└── README.md
```

## Prérequis

- **Serveur web** avec PHP 7.4+ (Apache, Nginx, ou serveur intégré PHP)
- **Navigateur moderne** (Chrome, Edge, Firefox, Safari à jour)
- **Clé API OpenRouter** : [Créer un compte](https://openrouter.ai/)

## Installation

### 1. Télécharger le projet

```bash
git clone https://github.com/leseeb22/editeur-ia.git
cd editeur-ia
```

### 2. Lancer un serveur PHP local

```bash
php -S localhost:8000
```

Ou utilisez XAMPP/WAMP/MAMP et placez le projet dans `htdocs/`.

### 3. Accéder à l'application

Ouvrez votre navigateur : **http://localhost:8000**

### 4. Configuration initiale

1. Cliquez sur **Paramètres**
2. Entrez votre **clé API OpenRouter** (`sk-or-...`)
3. Cliquez sur **Charger modèles**
4. Sélectionnez un modèle (recommandé : `anthropic/claude-3.5-sonnet`)
5. Choisissez vos thèmes préférés
6. **Sauvegarder**

## Utilisation

### Éditer un fichier

1. **Explorateur** : Cliquez sur un fichier dans `page/`
2. Le fichier s'ouvre dans l'éditeur CodeMirror
3. Modifiez le code manuellement ou via l'IA

### Demander des modifications à l'IA

1. Ouvrez un fichier (ex: `example.php`)
2. Dans le **chat**, tapez votre demande :
   - "Ajoute un formulaire de contact"
   - "Change la couleur du titre en bleu"
   - "Ajoute une fonction PHP pour valider les emails"
3. L'IA génère une réponse avec le code modifié
4. Cliquez sur **"Voir les modifications proposées"**
5. Le **diff** s'affiche avec :
   - 🟢 Lignes ajoutées (fond vert)
   - 🔴 Lignes supprimées (fond rouge, barrées)
6. **Accepter** ou **Refuser** les modifications

### Sauvegarder

- **Bouton "Sauvegarder"** ou **Ctrl+S**
- Une entrée est créée dans `logs/FICHIER.log.json`

### Consulter l'historique

- Cliquez sur **Historique** dans la barre supérieure
- Voir toutes les modifications (200 dernières)
- Filtrer par fichier

## Workflow typique

```
┌─────────────────────────────────────────────────┐
│ 1. Ouvrir un fichier (explorateur)              │
├─────────────────────────────────────────────────┤
│ 2. Demander une modification à l'IA (chat)      │
├─────────────────────────────────────────────────┤
│ 3. L'IA propose le nouveau code                 │
├─────────────────────────────────────────────────┤
│ 4. Visualiser le diff (vert/rouge)              │
├─────────────────────────────────────────────────┤
│ 5. Accepter ou refuser                          │
├─────────────────────────────────────────────────┤
│ 6. Sauvegarder (Ctrl+S)                         │
├─────────────────────────────────────────────────┤
│ 7. Modification journalisée dans logs/          │
└─────────────────────────────────────────────────┘
```

## Sécurité

### Protection des logs
Le fichier `logs/.htaccess` interdit l'accès direct aux journaux via HTTP.

### Validation des chemins
- Les API PHP bloquent les chemins avec `..` ou `./`
- Vérification que les fichiers sont dans `page/`
- `realpath()` utilisé pour empêcher directory traversal

### Clé API
- Stockée dans `localStorage` (client-side)
- **Attention** : Ne déployez pas en production sans proxy backend pour protéger la clé
- Pour un déploiement public, créez un backend Node/PHP qui appelle OpenRouter

## Personnalisation

### Ajouter des modes CodeMirror
Éditez `index.html` et ajoutez les scripts :
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
```

Puis dans `js/editor.js`, ajoutez l'extension :
```javascript
const modes = {
  'py': 'python',
  // ...
};
```

### Modifier le prompt système
Dans `js/chat.js`, fonction `buildSystemPrompt()` (ligne ~83)

## Dépannage

### Les fichiers ne s'affichent pas
- Vérifiez que le répertoire `page/` existe et contient des fichiers
- Vérifiez les permissions (lecture/écriture pour PHP)
- Ouvrez la console : `api/files.php` doit retourner du JSON

### Erreur 401 OpenRouter
- Vérifiez votre clé API (format `sk-or-...`)
- Vérifiez les crédits de votre compte OpenRouter

### Les modifications ne se sauvegardent pas
- Vérifiez les permissions d'écriture sur `page/` et `logs/`
- Console réseau : regardez la réponse de `api/write.php`

### Le diff ne s'affiche pas
- L'IA doit utiliser des blocs de code avec triple backticks : \`\`\`language
- Exemple de prompt : "Modifie le fichier et donne-moi le code complet entre \`\`\`php et \`\`\`"

## Technologies utilisées

- **Frontend** : HTML5, CSS Grid, Bootstrap 5, JavaScript ES6 Modules
- **Éditeur** : CodeMirror 5.65.16
- **Backend** : PHP 7.4+
- **IA** : OpenRouter API (Claude, GPT, Llama, etc.)

## Licence

MIT License - Libre d'utilisation et modification

## Auteur

Développé avec ❤️ et l'aide de Claude Code
