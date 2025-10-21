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
- **🆕 Mode Agent** : Création automatique de fichiers et planification multi-étapes

### 🤖 Mode Agent Autonome (NOUVEAU)
- **Création automatique de fichiers** : L'IA peut créer des fichiers avec confirmation
- **Planification de tâches complexes** : Décompose les grands projets en étapes
- **Exécution autonome** : Création de plusieurs fichiers d'affilée
- **Suivi visuel en temps réel** : Progression des étapes affichée
- **Validation avant exécution** : Chaque action nécessite votre approbation
- **3 formats détectés** : Blocs de code, JSON structuré, commandes explicites

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
│   ├── create.php         # 🆕 Crée un fichier avec template
│   ├── upload.php         # 🆕 Upload de fichiers
│   └── logs.php           # Consulte l'historique
├── js/                    # Frontend modulaire
│   ├── state.js           # Gestion de l'état
│   ├── api.js             # Client API
│   ├── fileExplorer.js    # Explorateur de fichiers
│   ├── fileManager.js     # 🆕 Gestion onglets & fichiers multiples
│   ├── editor.js          # Gestion CodeMirror (multi-fichiers)
│   ├── diff.js            # Système de diff
│   ├── agent.js           # 🆕 Mode agent autonome
│   ├── chat.js            # Chat IA
│   └── app.js             # Orchestrateur
├── page/                  # Fichiers à éditer
│   └── example.php        # Fichier d'exemple
├── logs/                  # Journaux (protégés)
├── index.html             # Interface principale
├── style.css              # Styles (grille CSS + agent)
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

### Travailler avec plusieurs fichiers (onglets)

1. Cliquez sur plusieurs fichiers dans l'**explorateur**
2. Chaque fichier s'ouvre dans un **onglet** en haut de l'éditeur
3. Cliquez sur un onglet pour basculer entre les fichiers
4. Un **point bleu** apparaît sur l'onglet si le fichier est modifié
5. Bouton **×** sur chaque onglet pour fermer (demande confirmation si modifié)
6. **Tout sauvegarder** : sauvegarde tous les fichiers modifiés en une fois
7. **Tout fermer** : ferme tous les onglets (demande confirmation si non sauvegardés)

### Créer un nouveau fichier

1. Cliquez sur le bouton **➕ Nouveau fichier** dans l'explorateur
2. Entrez le **nom du fichier** avec extension (.php, .html, .css, .js)
3. *(Optionnel)* Spécifiez un **dossier** (ex: `subfolder/`)
4. Choisissez un **template** :
   - **HTML** : Structure complète avec `<!DOCTYPE html>`
   - **PHP** : En-tête avec commentaires et `<?php`
   - **CSS** : Fichier avec commentaires de section
   - **JavaScript** : Fichier avec en-tête JSDoc
   - **Vide** : Fichier sans contenu
5. Cliquez sur **Créer**
6. Le fichier s'ouvre automatiquement dans l'éditeur

### Importer un fichier

1. Cliquez sur le bouton **📤 Importer** dans l'explorateur
2. **Sélectionnez** le fichier depuis votre ordinateur
   - Extensions supportées : `.php`, `.html`, `.css`, `.js`, `.json`, `.txt`, `.md`, `.xml`, `.svg`, images
   - Taille maximum : **10 Mo**
3. *(Optionnel)* Spécifiez un **dossier de destination** (ex: `assets/`)
4. Cliquez sur **Importer**
5. Le fichier est copié dans `page/` et apparaît dans l'explorateur

### Utiliser le Mode Agent

Le **Mode Agent** permet à l'IA de créer des fichiers automatiquement et de planifier des tâches complexes.

#### Activer le Mode Agent

1. Dans le **chat IA**, activez le toggle **🤖 Mode Agent**
2. Un badge **"Agent actif"** apparaît
3. Une bordure violette entoure l'interface

#### Créer un fichier avec l'Agent

Demandez à l'IA de créer un fichier :

**Exemples de prompts** :
- "Crée un fichier `contact.php` avec un formulaire de contact"
- "Génère un fichier `style.css` avec des styles pour un header responsive"
- "Fais-moi un fichier `script.js` pour valider un formulaire"

L'IA détecte automatiquement votre demande et :
1. Affiche une **confirmation** avec le nom du fichier et aperçu du contenu
2. Vous cliquez sur **Confirmer** ou **Annuler**
3. Si confirmé, le fichier est créé et ouvert dans l'éditeur

#### Planification de tâches complexes

Pour des projets multi-fichiers, demandez un plan :

**Exemple** : "Crée-moi un site vitrine avec header, footer, page d'accueil et page contact"

L'IA génère un **plan d'action** :
```
PLAN :
1. Créer le fichier header.php
2. Créer le fichier footer.php
3. Créer le fichier index.php
4. Créer le fichier contact.php
5. Créer le fichier style.css
```

Chaque étape affiche :
- ⏸️ **En attente** (gris)
- ⚡ **En cours** (bleu, pulsation)
- ✅ **Terminé** (vert)
- ❌ **Échoué** (rouge)

Vous validez **chaque action** avant exécution.

#### Formats détectés par l'Agent

L'Agent reconnaît 3 formats pour créer des fichiers :

**Format 1 - Bloc de code avec indication** :
```
Voici le fichier contact.php :
```php
<?php
// Code du formulaire
?>
```
```

**Format 2 - JSON structuré** :
```json
{
  "action": "create_file",
  "path": "contact.php",
  "content": "<?php ...",
  "template": "php"
}
```

**Format 3 - Commande explicite** :
```
CRÉER_FICHIER: contact.php
```

## Workflows typiques

### Workflow 1 : Modification de fichier avec l'IA

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

### Workflow 2 : Création de projet avec Mode Agent

```
┌─────────────────────────────────────────────────┐
│ 1. Activer le Mode Agent (toggle 🤖)            │
├─────────────────────────────────────────────────┤
│ 2. Demander un projet complet                   │
│    Ex: "Crée un site avec header/footer/home"   │
├─────────────────────────────────────────────────┤
│ 3. L'IA génère un PLAN avec les étapes          │
├─────────────────────────────────────────────────┤
│ 4. Valider le plan                              │
├─────────────────────────────────────────────────┤
│ 5. Pour chaque fichier :                        │
│    • L'IA propose la création                   │
│    • Voir l'aperçu du contenu                   │
│    • Confirmer ou annuler                       │
│    • Fichier créé et ouvert automatiquement     │
├─────────────────────────────────────────────────┤
│ 6. Tous les fichiers sont créés et loggés       │
├─────────────────────────────────────────────────┤
│ 7. Modifier manuellement ou demander ajustement │
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

### La création de fichier échoue
- Vérifiez les permissions d'écriture sur le dossier `page/`
- Le nom de fichier ne doit pas contenir de caractères spéciaux (`..`, `./`, `\`)
- Vérifiez dans la console réseau la réponse de `api/create.php`

### L'upload de fichier ne fonctionne pas
- Vérifiez que le fichier fait moins de **10 Mo**
- Vérifiez que l'extension est supportée (php, html, css, js, json, txt, md, xml, svg, images)
- Vérifiez les permissions PHP (`upload_max_filesize`, `post_max_size` dans `php.ini`)
- Consultez la console réseau pour voir l'erreur de `api/upload.php`

### Le Mode Agent ne détecte pas les fichiers à créer
- Assurez-vous d'avoir **activé le Mode Agent** (toggle 🤖)
- Soyez explicite dans votre demande : "Crée un fichier contact.php"
- Utilisez l'un des 3 formats reconnus (voir section "Formats détectés par l'Agent")
- Si un plan est généré, validez-le pour lancer la création

### Les onglets ne s'affichent pas
- Vérifiez la console JavaScript pour des erreurs dans `fileManager.js`
- Essayez de rafraîchir la page (F5)
- Vérifiez que plusieurs fichiers sont bien ouverts

## Technologies utilisées

- **Frontend** : HTML5, CSS Grid, Bootstrap 5, JavaScript ES6 Modules
- **Éditeur** : CodeMirror 5.65.16
- **Backend** : PHP 7.4+
- **IA** : OpenRouter API (Claude, GPT, Llama, etc.)

## Licence

MIT License - Libre d'utilisation et modification

## Auteur

Développé avec ❤️ et l'aide de Claude Code
