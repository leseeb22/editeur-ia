<?php
/**
 * API - Lire le contenu d'un fichier
 * GET: ?path=nomfichier.php
 * Retour JSON: {success: true, content: "...", path: "..."}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$pageDir = __DIR__ . '/../page';

if (!isset($_GET['path']) || empty($_GET['path'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Paramètre path manquant'
    ]);
    exit;
}

$requestedPath = $_GET['path'];

// Sécurité: bloquer les chemins relatifs dangereux
if (strpos($requestedPath, '..') !== false || strpos($requestedPath, './') !== false) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Chemin invalide'
    ]);
    exit;
}

$filePath = realpath($pageDir . '/' . $requestedPath);
$baseDir = realpath($pageDir);

// Vérifier que le fichier est bien dans page/
if (strpos($filePath, $baseDir) !== 0) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Accès interdit en dehors du répertoire page/'
    ]);
    exit;
}

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error' => 'Fichier introuvable'
    ]);
    exit;
}

if (!is_file($filePath)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Le chemin ne pointe pas vers un fichier'
    ]);
    exit;
}

try {
    $content = file_get_contents($filePath);

    echo json_encode([
        'success' => true,
        'path' => $requestedPath,
        'content' => $content,
        'size' => filesize($filePath),
        'modified' => filemtime($filePath)
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
