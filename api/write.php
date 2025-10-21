<?php
/**
 * API - Sauvegarder un fichier avec journalisation
 * POST: {path: "...", content: "...", action: "create|modify"}
 * Retour JSON: {success: true, logged: true}
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

// Créer le répertoire logs s'il n'existe pas
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

// Récupérer le JSON du body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['path']) || !isset($input['content'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Paramètres path et content requis'
    ]);
    exit;
}

$requestedPath = $input['path'];
$newContent = $input['content'];
$action = $input['action'] ?? 'modify'; // create|modify|delete

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
$baseDir = realpath($pageDir);
$realFilePath = realpath(dirname($filePath));

// Vérifier que le fichier est bien dans page/
if ($realFilePath && strpos($realFilePath, $baseDir) !== 0) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Accès interdit en dehors du répertoire page/'
    ]);
    exit;
}

// Créer le répertoire parent si nécessaire
$dir = dirname($filePath);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Récupérer l'ancien contenu pour le log
$oldContent = file_exists($filePath) ? file_get_contents($filePath) : '';
$fileExisted = file_exists($filePath);

try {
    // Sauvegarder le fichier
    $result = file_put_contents($filePath, $newContent);

    if ($result === false) {
        throw new Exception('Erreur lors de l\'écriture du fichier');
    }

    // Journalisation
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'datetime_iso' => date('c'),
        'path' => $requestedPath,
        'action' => $fileExisted ? 'modify' : 'create',
        'size_before' => $fileExisted ? strlen($oldContent) : 0,
        'size_after' => strlen($newContent),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    ];

    // Calculer le diff simple (ligne par ligne)
    $oldLines = $oldContent ? explode("\n", $oldContent) : [];
    $newLines = explode("\n", $newContent);

    $diff = [
        'lines_before' => count($oldLines),
        'lines_after' => count($newLines),
        'changes' => simpleDiff($oldLines, $newLines)
    ];

    $logEntry['diff'] = $diff;

    // Sauvegarder dans logs/FILENAME.log.json
    $logFileName = str_replace(['/', '\\'], '_', $requestedPath) . '.log.json';
    $logFilePath = $logsDir . '/' . $logFileName;

    $logs = [];
    if (file_exists($logFilePath)) {
        $logs = json_decode(file_get_contents($logFilePath), true) ?? [];
    }

    array_unshift($logs, $logEntry); // Ajouter en premier

    // Garder max 100 entrées par fichier
    if (count($logs) > 100) {
        $logs = array_slice($logs, 0, 100);
    }

    file_put_contents($logFilePath, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode([
        'success' => true,
        'path' => $requestedPath,
        'logged' => true,
        'action' => $logEntry['action'],
        'size' => strlen($newContent)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Calcul de diff simple ligne par ligne
 */
function simpleDiff($oldLines, $newLines) {
    $changes = [];
    $maxLines = max(count($oldLines), count($newLines));

    for ($i = 0; $i < $maxLines; $i++) {
        $oldLine = $oldLines[$i] ?? null;
        $newLine = $newLines[$i] ?? null;

        if ($oldLine === null && $newLine !== null) {
            // Ligne ajoutée
            $changes[] = [
                'type' => 'add',
                'line' => $i + 1,
                'content' => $newLine
            ];
        } elseif ($oldLine !== null && $newLine === null) {
            // Ligne supprimée
            $changes[] = [
                'type' => 'delete',
                'line' => $i + 1,
                'content' => $oldLine
            ];
        } elseif ($oldLine !== $newLine) {
            // Ligne modifiée
            $changes[] = [
                'type' => 'modify',
                'line' => $i + 1,
                'old' => $oldLine,
                'new' => $newLine
            ];
        }
    }

    return array_slice($changes, 0, 50); // Max 50 changements affichés
}
