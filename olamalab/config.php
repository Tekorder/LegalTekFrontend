<?php
declare(strict_types=1);

define('DB_HOST', 'localhost');
define('DB_NAME', 'olamalab');
define('DB_USER', 'root');
define('DB_PASS', '');
define('OLLAMA_GENERATE_URL', 'http://localhost:11434/api/generate');
define('OLLAMA_CHAT_URL', 'http://localhost:11434/api/chat');
define('DEFAULT_MODEL', 'llama3.2');
define('MAX_MEMORY_MESSAGES', 40);

/** Seconds to wait for Ollama (large models e.g. qwen may need 300+). */
define('OLLAMA_TIMEOUT', 300);

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    return $pdo;
}

function jsonResponse(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
