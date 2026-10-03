# Éditeur IA

Éditeur de code web assisté par IA, conçu pour travailler sur des fichiers PHP / HTML / CSS / JavaScript avec validation humaine des modifications.

## Fonctionnalités

- explorateur de fichiers ;
- édition multi-fichiers avec CodeMirror ;
- assistant IA via OpenRouter ;
- diff visuel avant application ;
- création et upload de fichiers ;
- mode agent avec étapes contrôlées ;
- journalisation locale des modifications.

## Architecture

```text
api/        API PHP de lecture / écriture / création
js/         modules frontend
page/       fichiers de travail
logs/       journaux générés localement
index.html  interface
style.css   styles
```

## Démarrage

```bash
php -S localhost:8000
```

Puis ouvrir `http://localhost:8000`.

## Configuration IA

La clé OpenRouter est configurée depuis l'interface. Ne versionnez jamais de clé API, fichier de configuration local ou journal d'exécution contenant des informations sensibles.

## Sécurité

Le backend limite les opérations au répertoire `page/`. Ce projet reste un outil de développement : ne l'exposez pas publiquement sans authentification, restriction réseau et revue des permissions d'écriture.

## Développement

Les sauvegardes `*.old`, les réglages locaux Claude et les logs générés sont exclus du dépôt. Git constitue l'historique de référence.

## Auteur

Sébastien Vidotto — Heteractis.
