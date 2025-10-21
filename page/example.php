<?php
/**
 * Fichier d'exemple pour tester l'éditeur IA
 */

$title = "Bienvenue";
$message = "Ceci est un fichier d'exemple";

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title; ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
    </style>
</head>
<body>
    <h1><?php echo $title; ?></h1>
    <p><?php echo $message; ?></p>

    <p>Vous pouvez demander à l'IA de modifier ce fichier !</p>

    <ul>
        <li>Ajouter du contenu</li>
        <li>Modifier le style</li>
        <li>Ajouter des fonctionnalités PHP</li>
    </ul>
</body>
</html>
