<?php
/**
 * API - Créer un nouveau fichier
 * POST: {path: "folder/file.php", template: "html|php|css|js|blank"}
 * Retour JSON: {success: true, path: "..."}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$pageDir = __DIR__ . '/../page';
$logsDir = __DIR__ . '/../logs';

// Récupérer le JSON du body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['path'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Paramètre path requis'
    ]);
    exit;
}

$requestedPath = $input['path'];
$template = $input['template'] ?? 'blank';

// Sécurité: bloquer les chemins relatifs dangereux
if (strpos($requestedPath, '..') !== false || strpos($requestedPath, './') !== false) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Chemin invalide'
    ]);
    exit;
}

$filePath = $pageDir . '/' . $requestedPath;

// Vérifier si le fichier existe déjà
if (file_exists($filePath)) {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'error' => 'Le fichier existe déjà'
    ]);
    exit;
}

// Créer le répertoire parent si nécessaire
$dir = dirname($filePath);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Templates
$templates = [
    'html' => '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouveau document</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
    </style>
</head>
<body>
    <h1>Nouveau document HTML</h1>
    <p>Contenu à modifier...</p>
</body>
</html>',

    'php' => '<?php
/**
 * Nouveau fichier PHP
 */

// Votre code ici

?>',

    'css' => '/* Nouveau fichier CSS */

body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
}',

    'js' => '/**
 * Nouveau fichier JavaScript
 */

// Votre code ici
',

    'blank' => ''
];

$content = $templates[$template] ?? $templates['blank'];

try {
    // Créer le fichier
    $result = file_put_contents($filePath, $content);

    if ($result === false) {
        throw new Exception('Erreur lors de la création du fichier');
    }

    // Journalisation
    if (!is_dir($logsDir)) {
        mkdir($logsDir, 0755, true);
    }

    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'datetime_iso' => date('c'),
        'path' => $requestedPath,
        'action' => 'create',
        'template' => $template,
        'size_after' => strlen($content),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    ];

    $logFileName = str_replace(['/', '\\'], '_', $requestedPath) . '.log.json';
    $logFilePath = $logsDir . '/' . $logFileName;

    $logs = [];
    if (file_exists($logFilePath)) {
        $logs = json_decode(file_get_contents($logFilePath), true) ?? [];
    }

    array_unshift($logs, $logEntry);

    if (count($logs) > 100) {
        $logs = array_slice($logs, 0, 100);
    }

    file_put_contents($logFilePath, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode([
        'success' => true,
        'path' => $requestedPath,
        'action' => 'create',
        'size' => strlen($content),
        'template' => $template
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
