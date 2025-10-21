<?php
/**
 * API - Upload un fichier dans le répertoire page/
 * POST multipart/form-data: file + folder (optionnel)
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

// Vérifier qu'un fichier a été envoyé
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Aucun fichier reçu ou erreur d\'upload'
    ]);
    exit;
}

$file = $_FILES['file'];
$folder = isset($_POST['folder']) ? trim($_POST['folder']) : '';

// Sécurité: nettoyer le nom de fichier
$filename = basename($file['name']);
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);

// Sécurité: bloquer les chemins relatifs dangereux dans le dossier
if (strpos($folder, '..') !== false || strpos($folder, './') !== false) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Chemin de dossier invalide'
    ]);
    exit;
}

// Construire le chemin
$relativePath = $folder ? $folder . '/' . $filename : $filename;
$targetPath = $pageDir . '/' . $relativePath;

// Créer le dossier si nécessaire
$dir = dirname($targetPath);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Vérifier si le fichier existe déjà
if (file_exists($targetPath)) {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'error' => 'Le fichier existe déjà',
        'path' => $relativePath
    ]);
    exit;
}

// Extensions autorisées
$allowedExtensions = ['php', 'html', 'htm', 'css', 'js', 'json', 'txt', 'md', 'xml', 'svg', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

if (!in_array($ext, $allowedExtensions)) {
    http_response_code(415);
    echo json_encode([
        'success' => false,
        'error' => 'Type de fichier non autorisé. Extensions autorisées: ' . implode(', ', $allowedExtensions)
    ]);
    exit;
}

// Limite de taille: 10 Mo
$maxSize = 10 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    http_response_code(413);
    echo json_encode([
        'success' => false,
        'error' => 'Fichier trop volumineux (max 10 Mo)'
    ]);
    exit;
}

try {
    // Déplacer le fichier uploadé
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Erreur lors du déplacement du fichier');
    }

    // Journalisation
    if (!is_dir($logsDir)) {
        mkdir($logsDir, 0755, true);
    }

    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'datetime_iso' => date('c'),
        'path' => $relativePath,
        'action' => 'upload',
        'size' => $file['size'],
        'original_name' => $file['name'],
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    ];

    $logFileName = str_replace(['/', '\\'], '_', $relativePath) . '.log.json';
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
        'path' => $relativePath,
        'action' => 'upload',
        'size' => $file['size'],
        'filename' => $filename
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
