<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

$sqlFile = __DIR__ . '/schema.sql';
if (!file_exists($sqlFile)) {
    die('schema.sql not found');
}

try {
    $pdo = new PDO(
        'mysql:host=localhost;charset=utf8mb4',
        'root',
        '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $sql = file_get_contents($sqlFile);
    $pdo->exec($sql);

    echo '<pre style="background:#0a0a0a;color:#0f0;font-family:monospace;padding:2rem;">';
    echo "[OK] Database olamalab installed.\n";
    echo "[OK] Table prompts_log ready.\n\n";
    echo "→ Open: http://localhost/olamalab/\n";
    echo "→ API:  POST http://localhost/olamalab/api.php?action=api\n";
    echo '</pre>';
} catch (PDOException $e) {
    echo '<pre style="color:#f55;">ERROR: ' . htmlspecialchars($e->getMessage()) . '</pre>';
}
