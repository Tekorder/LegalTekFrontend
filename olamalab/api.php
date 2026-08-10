<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    jsonResponse(array('ok' => true));
}

$action = isset($_GET['action']) ? $_GET['action'] : 'generate';

try {
    switch ($action) {
        case 'generate':
            handleGenerate('local');
            break;
        case 'api':
            handleGenerate('api');
            break;
        case 'history':
            handleHistory();
            break;
        case 'conversations':
            handleConversationsList();
            break;
        case 'conversation':
            handleConversationDetail();
            break;
        case 'conversation_delete':
            handleConversationDelete();
            break;
        case 'conversation_new':
            handleConversationNew();
            break;
        case 'models':
            handleModels();
            break;
        case 'health':
            jsonResponse(array(
                'status' => 'online',
                'chat'   => OLLAMA_CHAT_URL,
                'memory' => true,
            ));
            break;
        default:
            jsonResponse(array('error' => 'Unknown action'), 404);
            break;
    }
} catch (PDOException $e) {
    jsonResponse(array('error' => 'Database error', 'detail' => $e->getMessage()), 500);
} catch (Exception $e) {
    jsonResponse(array('error' => $e->getMessage()), 500);
}

function handleGenerate($source)
{
    $timeout = defined('OLLAMA_TIMEOUT') ? (int)OLLAMA_TIMEOUT : 300;
    if ($timeout < 60) {
        $timeout = 60;
    }
    @set_time_limit($timeout + 60);
    @ini_set('max_execution_time', (string)($timeout + 60));

    $body = readJsonBody();
    $prompt = trim(isset($body['prompt']) ? $body['prompt'] : '');
    $model = isset($body['model']) ? $body['model'] : DEFAULT_MODEL;
    $stream = !empty($body['stream']);
    $conversationId = isset($body['conversation_id']) ? (int)$body['conversation_id'] : 0;
    $useMemory = !isset($body['memory']) || $body['memory'] !== false;

    if ($prompt === '') {
        jsonResponse(array('error' => 'prompt is required'), 400);
    }

    if ($conversationId > 0 && !conversationExists($conversationId, $source)) {
        jsonResponse(array('error' => 'conversation not found'), 404);
    }

    if ($conversationId === 0) {
        $conversationId = createConversation($source, $model, conversationTitleFromPrompt($prompt));
    }

    $userMessageId = saveMessage($conversationId, 'user', $prompt);
    touchConversation($conversationId, $model);

    $messages = $useMemory
        ? loadMessagesForOllama($conversationId)
        : array(array('role' => 'user', 'content' => $prompt));

    $payload = array(
        'model'    => $model,
        'messages' => $messages,
        'stream'   => $stream,
    );

    $start = microtime(true);
    $ollamaResult = callOllamaChat($payload);
    $durationMs = (int)round((microtime(true) - $start) * 1000);

    $status = $ollamaResult['ok'] ? 'ok' : 'error';
    $responseText = null;
    if ($ollamaResult['ok'] && isset($ollamaResult['data']['message']['content'])) {
        $responseText = $ollamaResult['data']['message']['content'];
    }
    $errorMsg = $ollamaResult['ok'] ? null : $ollamaResult['error'];

    $assistantMessageId = null;
    if ($responseText !== null && $responseText !== '') {
        $assistantMessageId = saveMessage($conversationId, 'assistant', $responseText);
    }

    $logId = saveLog(
        $source,
        $model,
        $prompt,
        $payload,
        $responseText,
        $ollamaResult['data'],
        $durationMs,
        $status,
        $errorMsg,
        $conversationId,
        $userMessageId
    );

    if (!$ollamaResult['ok']) {
        jsonResponse(array(
            'error'           => $errorMsg,
            'log_id'          => $logId,
            'conversation_id' => $conversationId,
            'payload'         => $payload,
        ), 502);
    }

    jsonResponse(array(
        'log_id'           => $logId,
        'conversation_id'  => $conversationId,
        'message_id'       => $assistantMessageId,
        'source'           => $source,
        'model'            => $model,
        'prompt'           => $prompt,
        'response'         => $responseText,
        'payload_sent'     => $payload,
        'ollama'           => $ollamaResult['data'],
        'duration_ms'      => $durationMs,
        'memory_messages'  => count($messages),
    ));
}

function callOllamaChat(array $payload)
{
    $timeout = defined('OLLAMA_TIMEOUT') ? (int)OLLAMA_TIMEOUT : 300;
    if ($timeout < 60) {
        $timeout = 60;
    }

    $ch = curl_init(OLLAMA_CHAT_URL);
    curl_setopt_array($ch, array(
        CURLOPT_POST            => true,
        CURLOPT_POSTFIELDS      => json_encode($payload),
        CURLOPT_RETURNTRANSFER  => true,
        CURLOPT_HTTPHEADER      => array('Content-Type: application/json'),
        CURLOPT_CONNECTTIMEOUT  => 30,
        CURLOPT_TIMEOUT         => $timeout,
    ));

    $raw = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErrno = curl_errno($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        if ($curlErrno === 28) {
            return array(
                'ok'    => false,
                'error' => 'Ollama timed out after ' . $timeout . 's. Try a smaller model, disable memory, or raise OLLAMA_TIMEOUT in config.php',
                'data'  => null,
            );
        }
        return array('ok' => false, 'error' => 'Ollama unreachable: ' . $curlError, 'data' => null);
    }

    $data = json_decode($raw, true);
    if ($httpCode >= 400 || !is_array($data)) {
        return array('ok' => false, 'error' => 'Ollama error: ' . $raw, 'data' => null);
    }

    return array('ok' => true, 'data' => $data, 'error' => null);
}

function createConversation($source, $model, $title)
{
    $stmt = db()->prepare(
        'INSERT INTO conversations (source, title, model) VALUES (:source, :title, :model)'
    );
    $stmt->execute(array(
        ':source' => $source,
        ':title'  => $title,
        ':model'  => $model,
    ));
    return (int)db()->lastInsertId();
}

function conversationExists($id, $source)
{
    $stmt = db()->prepare('SELECT id FROM conversations WHERE id = :id AND source = :source');
    $stmt->execute(array(':id' => $id, ':source' => $source));
    return (bool)$stmt->fetch();
}

function touchConversation($id, $model)
{
    $stmt = db()->prepare('UPDATE conversations SET model = :model, updated_at = NOW() WHERE id = :id');
    $stmt->execute(array(':id' => $id, ':model' => $model));
}

function conversationTitleFromPrompt($prompt)
{
    $t = preg_replace('/\s+/', ' ', trim($prompt));
    if (function_exists('mb_substr')) {
        return mb_substr($t, 0, 80) . (mb_strlen($t) > 80 ? '…' : '');
    }
    return substr($t, 0, 80) . (strlen($t) > 80 ? '...' : '');
}

function saveMessage($conversationId, $role, $content)
{
    $stmt = db()->prepare(
        'INSERT INTO messages (conversation_id, role, content) VALUES (:cid, :role, :content)'
    );
    $stmt->execute(array(
        ':cid'     => $conversationId,
        ':role'    => $role,
        ':content' => $content,
    ));
    return (int)db()->lastInsertId();
}

function loadMessagesForOllama($conversationId)
{
    $limit = (int)MAX_MEMORY_MESSAGES;
    $stmt = db()->prepare(
        "SELECT role, content FROM messages
         WHERE conversation_id = :cid
         ORDER BY id DESC
         LIMIT {$limit}"
    );
    $stmt->execute(array(':cid' => $conversationId));
    $rows = array_reverse($stmt->fetchAll());

    $messages = array();
    foreach ($rows as $row) {
        $messages[] = array(
            'role'    => $row['role'],
            'content' => $row['content'],
        );
    }
    return $messages;
}

function saveLog(
    $source,
    $model,
    $prompt,
    array $payload,
    $responseText,
    $responseRaw,
    $durationMs,
    $status,
    $errorMessage,
    $conversationId = null,
    $messageId = null
) {
    $stmt = db()->prepare(
        'INSERT INTO prompts_log
        (conversation_id, message_id, source, model, prompt, request_payload, response_text, response_raw,
         client_ip, user_agent, duration_ms, status, error_message)
        VALUES (:conv, :msg, :source, :model, :prompt, :payload, :response_text, :response_raw,
                :ip, :ua, :duration, :status, :error)'
    );

    $stmt->execute(array(
        ':conv'          => $conversationId,
        ':msg'           => $messageId,
        ':source'        => $source,
        ':model'         => $model,
        ':prompt'        => $prompt,
        ':payload'       => json_encode($payload, JSON_UNESCAPED_UNICODE),
        ':response_text' => $responseText,
        ':response_raw'  => $responseRaw ? json_encode($responseRaw, JSON_UNESCAPED_UNICODE) : null,
        ':ip'            => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
        ':ua'            => substr(isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '', 0, 512),
        ':duration'      => $durationMs,
        ':status'        => $status,
        ':error'         => $errorMessage,
    ));

    return (int)db()->lastInsertId();
}

function handleHistory()
{
    $source = isset($_GET['source']) ? $_GET['source'] : 'api';
    $limit = min(200, max(1, (int)(isset($_GET['limit']) ? $_GET['limit'] : 50)));
    $conversationId = isset($_GET['conversation_id']) ? (int)$_GET['conversation_id'] : 0;

    $sql = 'SELECT id, conversation_id, source, model, prompt, request_payload, response_text,
                   response_raw, client_ip, user_agent, duration_ms, status,
                   error_message, created_at
            FROM prompts_log
            WHERE source = :source';
    $params = array(':source' => $source);

    if ($conversationId > 0) {
        $sql .= ' AND conversation_id = :cid';
        $params[':cid'] = $conversationId;
    }

    $sql .= ' ORDER BY id DESC LIMIT ' . $limit;

    $stmt = db()->prepare($sql);
    $stmt->execute($params);

    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['request_payload'] = json_decode(isset($row['request_payload']) ? $row['request_payload'] : '{}', true);
        $row['response_raw'] = $row['response_raw']
            ? json_decode($row['response_raw'], true)
            : null;
    }

    jsonResponse(array('items' => $rows, 'count' => count($rows)));
}

function handleConversationsList()
{
    $source = isset($_GET['source']) ? $_GET['source'] : 'local';
    $limit = min(100, max(1, (int)(isset($_GET['limit']) ? $_GET['limit'] : 50)));

    $stmt = db()->prepare(
        'SELECT c.id, c.title, c.model, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = "user" ORDER BY m.id ASC LIMIT 1) AS first_prompt
         FROM conversations c
         WHERE c.source = :source
         ORDER BY c.updated_at DESC
         LIMIT ' . $limit
    );
    $stmt->execute(array(':source' => $source));
    jsonResponse(array('items' => $stmt->fetchAll()));
}

function handleConversationDetail()
{
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        jsonResponse(array('error' => 'id required'), 400);
    }

    $stmt = db()->prepare('SELECT * FROM conversations WHERE id = :id');
    $stmt->execute(array(':id' => $id));
    $conv = $stmt->fetch();
    if (!$conv) {
        jsonResponse(array('error' => 'not found'), 404);
    }

    $stmt = db()->prepare(
        'SELECT id, role, content, created_at FROM messages
         WHERE conversation_id = :id ORDER BY id ASC'
    );
    $stmt->execute(array(':id' => $id));

    $conv['messages'] = $stmt->fetchAll();
    jsonResponse($conv);
}

function handleConversationNew()
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(array('error' => 'POST required'), 405);
    }
    $body = readJsonBody();
    $source = isset($body['source']) ? $body['source'] : 'local';
    $model = isset($body['model']) ? $body['model'] : DEFAULT_MODEL;
    $title = isset($body['title']) ? $body['title'] : 'New conversation';

    $id = createConversation($source, $model, $title);
    jsonResponse(array('conversation_id' => $id, 'title' => $title, 'model' => $model));
}

function handleConversationDelete()
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(array('error' => 'POST required'), 405);
    }
    $body = readJsonBody();
    $id = isset($body['id']) ? (int)$body['id'] : 0;
    if ($id <= 0) {
        jsonResponse(array('error' => 'id required'), 400);
    }

    $stmt = db()->prepare('DELETE FROM conversations WHERE id = :id');
    $stmt->execute(array(':id' => $id));
    jsonResponse(array('deleted' => $id));
}

function handleModels()
{
    $ch = curl_init('http://localhost:11434/api/tags');
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ));
    $raw = curl_exec($ch);
    curl_close($ch);

    if ($raw === false) {
        jsonResponse(array('models' => array(DEFAULT_MODEL)));
    }

    $data = json_decode($raw, true);
    $names = array_column(isset($data['models']) ? $data['models'] : array(), 'name');
    jsonResponse(array('models' => $names ? $names : array(DEFAULT_MODEL)));
}
