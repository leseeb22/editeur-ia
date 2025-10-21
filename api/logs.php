<?php
/**
 * API - Consulter l'historique des modifications
 * GET: ?path=nomfichier.php (optionnel, sinon tous les logs)
 * Retour JSON: {success: true, logs: [...]}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$logsDir = __DIR__ . '/../logs';

if (!is_dir($logsDir)) {
    echo json_encode([
        'success' => true,
        'logs' => [],
        'message' => 'Aucun log disponible'
    ]);
    exit;
}

try {
    // Si un fichier spécifique est demandé
    if (isset($_GET['path']) && !empty($_GET['path'])) {
        $requestedPath = $_GET['path'];
        $logFileName = str_replace(['/', '\\'], '_', $requestedPath) . '.log.json';
        $logFilePath = $logsDir . '/' . $logFileName;

        if (!file_exists($logFilePath)) {
            echo json_encode([
                'success' => true,
                'logs' => [],
                'path' => $requestedPath,
                'message' => 'Aucun log pour ce fichier'
            ]);
            exit;
        }

        $logs = json_decode(file_get_contents($logFilePath), true) ?? [];

        echo json_encode([
            'success' => true,
            'path' => $requestedPath,
            'logs' => $logs,
            'count' => count($logs)
        ]);
    } else {
        // Tous les logs
        $allLogs = [];
        $files = scandir($logsDir);

        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || !str_ends_with($file, '.log.json')) {
                continue;
            }

            $filePath = $logsDir . '/' . $file;
            $logs = json_decode(file_get_contents($filePath), true) ?? [];

            foreach ($logs as $log) {
                $log['log_file'] = $file;
                $allLogs[] = $log;
            }
        }

        // Trier par date décroissante
        usort($allLogs, function($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });

        // Limiter à 200 entrées
        $allLogs = array_slice($allLogs, 0, 200);

        echo json_encode([
            'success' => true,
            'logs' => $allLogs,
            'count' => count($allLogs),
            'message' => 'Historique global (200 dernières entrées)'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
