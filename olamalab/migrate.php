<?php
header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS conversations (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            source ENUM('local', 'api') NOT NULL DEFAULT 'local',
            title VARCHAR(255) NOT NULL DEFAULT 'New conversation',
            model VARCHAR(64) NOT NULL DEFAULT 'llama3.2',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_source_updated (source, updated_at DESC)
        ) ENGINE=InnoDB
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS messages (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT UNSIGNED NOT NULL,
            role ENUM('user', 'assistant', 'system') NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            INDEX idx_conversation (conversation_id, id)
        ) ENGINE=InnoDB
    ");

    $cols = $pdo->query("SHOW COLUMNS FROM prompts_log LIKE 'conversation_id'")->fetch();
    if (!$cols) {
        $pdo->exec('ALTER TABLE prompts_log ADD COLUMN conversation_id INT UNSIGNED NULL AFTER id');
    }

    $cols = $pdo->query("SHOW COLUMNS FROM prompts_log LIKE 'message_id'")->fetch();
    if (!$cols) {
        $pdo->exec('ALTER TABLE prompts_log ADD COLUMN message_id INT UNSIGNED NULL AFTER conversation_id');
    }

    echo '<pre style="background:#0a0a0a;color:#0f0;font-family:monospace;padding:2rem;">';
    echo "[OK] Memory tables installed: conversations + messages\n";
    echo "[OK] prompts_log linked to conversations\n";
    echo '</pre>';
} catch (PDOException $e) {
    echo '<pre style="color:#f55;">ERROR: ' . htmlspecialchars($e->getMessage()) . '</pre>';
}
