chatia (version HTML/CSS/JS pure)

Contenu
- index.html: page principale (Bootstrap 5 via CDN)
- style.css: thèmes clair/sombre/système, styles des bulles, skeleton et spinner
- app.js: logique UI (paramètres, historique, chat, streaming, stop)

Prérequis
- Un navigateur moderne (Chrome/Edge/Firefox/Safari à jour)
- Une clé OpenRouter « sk-or-… » (compte OpenRouter requis)

Utilisation
1) Ouvrez versionhtml/index.html dans votre navigateur.
2) Cliquez sur Paramètres et collez votre clé API OpenRouter.
3) Cliquez sur « Charger les modèles » pour remplir la liste, choisissez un modèle.
4) (Optionnel) Ajustez Titre, Prompt système, Message d’accueil, Thème et Streaming.
5) Sauvegardez puis envoyez un message.

Fonctionnalités
- Streaming (réponse progressive) et mode non-streaming (réponse complète)
- Bouton « Arrêter » pour couper la génération en cours
- Indicateurs de chargement: skeleton + spinner + points animés dans Envoyer
- Historique des conversations (localStorage): ouvrir/renommer/supprimer/nouveau
- Titre cliquable si une URL de site est définie
- Bouton « Tester l’API »: vérifie l’accès modèle + un prompt court

Notes / Sécurité
- Cette version appelle l’API OpenRouter directement depuis le navigateur; la clé API réside dans le localStorage et transite côté client. Pour un déploiement public, privilégiez un proxy serveur (voir la version Node dans le répertoire racine) afin de protéger la clé.
- CORS/origine: ouvrir le fichier en « file:// » peut poser problème selon le navigateur. Si besoin, servez le dossier via un serveur statique (ex.: « python -m http.server » dans versionhtml/), puis accédez à http://localhost:8000.

Dépannage
- 401: vérifiez la clé, les droits de votre compte et le format « sk-or-… ».
- 429: quota/limites atteints; patientez ou changez de modèle.
- 5xx: réessayez; changez de modèle en cas d’incident fournisseur.
- La liste des modèles ne se charge pas: assurez-vous d’avoir cliqué « Charger les modèles » après avoir saisi la clé; vérifiez la console réseau.

