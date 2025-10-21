<?php
/**
 * API - Liste tous les fichiers du répertoire page/
 * Retour JSON: {success: true, files: [...]}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$pageDir = __DIR__ . '/../page';

function scanDirectory($dir, $basePath = '') {
    $result = [];

    if (!is_dir($dir)) {
        return $result;
    }

    $items = scandir($dir);

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;

        $fullPath = $dir . '/' . $item;
        $relativePath = $basePath ? $basePath . '/' . $item : $item;

        if (is_dir($fullPath)) {
            $result[] = [
                'name' => $item,
                'path' => $relativePath,
                'type' => 'directory',
                'children' => scanDirectory($fullPath, $relativePath)
            ];
        } else {
            $ext = pathinfo($item, PATHINFO_EXTENSION);
            $result[] = [
                'name' => $item,
                'path' => $relativePath,
                'type' => 'file',
                'extension' => $ext,
                'size' => filesize($fullPath),
                'modified' => filemtime($fullPath)
            ];
        }
    }

    return $result;
}

try {
    $files = scanDirectory($pageDir);

    echo json_encode([
        'success' => true,
        'files' => $files,
        'basePath' => 'page/'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
