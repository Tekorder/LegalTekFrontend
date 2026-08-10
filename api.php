<?php
/**
 * LegalTek AI — api.php
 * MVP REST API · Pure PHP · No frameworks
 *
 * Hierarchy: users → cases → conversations → messages
 *                          → documents
 *
 * DB: credentials come from .env via config.php (see .env.example)
 * Requires config.php with Ollama and CourtListener settings.
 */

require_once __DIR__ . '/config.php';

// ── CORS (JSON Content-Type set below except for binary export) ──
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── DB Connection ─────────────────────────────────────────
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    json_err('Database connection failed: ' . $e->getMessage(), 500);
}

// ── Helpers ───────────────────────────────────────────────
function json_ok($data = [])
{
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_err(string $msg, int $code = 400)
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8', true);
    }
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── Binary export (DOCX) — must run before JSON Content-Type ──
if ($action === 'documents.export_docx') {
    documents_export_docx($pdo);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ── Router ────────────────────────────────────────────────

$routes = [
    // Cases
    'cases.list'           => 'cases_list',
    'cases.create'         => 'cases_create',
    'cases.update'         => 'cases_update',
    'cases.delete'         => 'cases_delete',
    'cases.members'        => 'cases_members',
    'cases.invite'         => 'cases_invite',
    'cases.remove_member'  => 'cases_remove_member',
    // Users
    'users.list'              => 'users_list',
    'users.find_by_email'     => 'users_find_by_email',
    'users.sync_firebase'     => 'users_sync_firebase',
    // Conversations
    'conversations.list'          => 'conversations_list',
    'conversations.create'        => 'conversations_create',
    'conversations.rename'        => 'conversations_rename',
    'conversations.delete'        => 'conversations_delete',
    'conversations.members'       => 'conversations_members',
    'conversations.add_member'    => 'conversations_add_member',
    'conversations.remove_member' => 'conversations_remove_member',
    // Messages
    'messages.list'        => 'messages_list',
    'messages.send'        => 'messages_send',
    // Folders (mini-drive)
    'folders.list'         => 'folders_list',
    'folders.create'       => 'folders_create',
    'folders.rename'       => 'folders_rename',
    'folders.delete'       => 'folders_delete',
    // Documents
    'documents.get'        => 'documents_get',
    'documents.save_text'  => 'documents_save_text',
    'documents.upload'       => 'documents_upload',
    'documents.create_empty' => 'documents_create_empty',
    'documents.list'       => 'documents_list',
    'documents.list_all'   => 'documents_list_all',
    'documents.delete'     => 'documents_delete',
    'documents.ai_edit'    => 'documents_ai_edit',
];

if (!isset($routes[$action])) {
    json_err("Unknown action: '$action'", 404);
}

call_user_func($routes[$action], $pdo);


// ═══════════════════════════════════════════════════════════
//  CASES
// ═══════════════════════════════════════════════════════════

/**
 * GET api.php?action=cases.list&user_id=1
 * Returns all cases for the user with conversation + document counts.
 */
function cases_list(PDO $pdo)
{
    $user_id = (int)($_GET['user_id'] ?? 1);

    $stmt = $pdo->prepare("
        SELECT
            k.id,
            k.user_id,
            k.title,
            k.description,
            k.matter_type,
            k.status,
            k.created_at,
            k.updated_at,
            COUNT(DISTINCT c.id)  AS conversation_count,
            COUNT(DISTINCT d.id)  AS document_count,
            COUNT(DISTINCT cm.user_id) AS member_count
        FROM `cases` k
        LEFT JOIN conversations  c  ON c.case_id  = k.id
        LEFT JOIN documents      d  ON d.case_id  = k.id
        LEFT JOIN case_members   cm ON cm.case_id = k.id
        WHERE k.user_id = ?
        GROUP BY k.id
        ORDER BY k.status ASC, k.updated_at DESC
    ");
    $stmt->execute([$user_id]);

    json_ok($stmt->fetchAll());
}

/**
 * Ensure a default "Personal" case exists for the user (single-workspace UX; `cases` table kept for future multi-case).
 */
function cases_ensure_personal_case(PDO $pdo, int $user_id): array
{
    $stmt = $pdo->prepare("
        SELECT id, user_id, title, description, matter_type, status, created_at, updated_at
        FROM `cases`
        WHERE user_id = ? AND title = 'Personal'
        ORDER BY id ASC
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return [
            'id'          => (int)$row['id'],
            'user_id'     => (int)$row['user_id'],
            'title'       => $row['title'],
            'description' => $row['description'],
            'matter_type' => $row['matter_type'],
            'status'      => $row['status'],
            'created_at'  => $row['created_at'],
            'updated_at'  => $row['updated_at'],
        ];
    }

    $pdo->prepare("
        INSERT INTO `cases` (user_id, title, description, matter_type, status)
        VALUES (?, 'Personal', 'Default workspace', 'other', 'active')
    ")->execute([$user_id]);
    $id = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT IGNORE INTO case_members (case_id, user_id, role) VALUES (?, ?, 'owner')")
        ->execute([$id, $user_id]);
    $now = date('Y-m-d H:i:s');

    return [
        'id'          => $id,
        'user_id'     => $user_id,
        'title'       => 'Personal',
        'description' => 'Default workspace',
        'matter_type' => 'other',
        'status'      => 'active',
        'created_at'  => $now,
        'updated_at'  => $now,
    ];
}

/**
 * POST api.php?action=cases.create
 * Body JSON: { "user_id": 1, "title": "Smith vs Jones", "description": "...", "matter_type": "litigation" }
 */
function cases_create(PDO $pdo)
{
    $b           = body();
    $user_id     = (int)($b['user_id'] ?? 1);
    $title       = trim($b['title'] ?? '');
    $description = trim($b['description'] ?? '');
    $matter_type = in_array($b['matter_type'] ?? '', ['contract','litigation','advisory','corporate','analysis_reporting','other'])
                   ? $b['matter_type'] : 'other';

    if (!$title) json_err('title is required');

    $stmt = $pdo->prepare(
        "INSERT INTO `cases` (user_id, title, description, matter_type) VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$user_id, $title, $description ?: null, $matter_type]);

    $id = (int)$pdo->lastInsertId();

    // Auto-add creator as owner in case_members
    $pdo->prepare("INSERT IGNORE INTO case_members (case_id, user_id, role) VALUES (?, ?, 'owner')")
        ->execute([$id, $user_id]);

    json_ok([
        'id'                 => $id,
        'user_id'            => $user_id,
        'title'              => $title,
        'description'        => $description ?: null,
        'matter_type'        => $matter_type,
        'status'             => 'active',
        'conversation_count' => 0,
        'document_count'     => 0,
        'created_at'         => date('Y-m-d H:i:s'),
        'updated_at'         => date('Y-m-d H:i:s'),
    ]);
}

/**
 * POST api.php?action=cases.update
 * Body JSON: { "case_id": 1, "title": "...", "description": "...", "matter_type": "...", "status": "..." }
 */
function cases_update(PDO $pdo)
{
    $b           = body();
    $case_id     = (int)($b['case_id'] ?? 0);
    $title       = trim($b['title'] ?? '');
    $description = trim($b['description'] ?? '');
    $matter_type = in_array($b['matter_type'] ?? '', ['contract','litigation','advisory','corporate','analysis_reporting','other'])
                   ? $b['matter_type'] : null;
    $status      = in_array($b['status'] ?? '', ['active','closed','archived'])
                   ? $b['status'] : null;

    if (!$case_id) json_err('case_id is required');
    if (!$title)   json_err('title is required');

    $pdo->prepare("
        UPDATE `cases`
        SET title       = ?,
            description = ?,
            matter_type = COALESCE(?, matter_type),
            status      = COALESCE(?, status),
            updated_at  = NOW()
        WHERE id = ?
    ")->execute([$title, $description ?: null, $matter_type, $status, $case_id]);

    json_ok(['id' => $case_id, 'title' => $title]);
}

/**
 * GET api.php?action=cases.members&case_id=1
 * Returns all members of a case with user info.
 */
function cases_members(PDO $pdo)
{
    $case_id = (int)($_GET['case_id'] ?? 0);
    if (!$case_id) json_err('case_id is required');

    $stmt = $pdo->prepare("
        SELECT
            cm.case_id,
            cm.user_id,
            cm.role,
            cm.invited_by,
            cm.joined_at,
            u.name,
            u.email,
            u.plan,
            u.avatar_url
        FROM case_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.case_id = ?
        ORDER BY cm.role ASC, cm.joined_at ASC
    ");
    $stmt->execute([$case_id]);

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=cases.invite
 * Body JSON: { "case_id": 1, "user_id": 2 }
 * Adds a user as member. Silently ignores if already a member.
 */
function cases_invite(PDO $pdo)
{
    $b       = body();
    $case_id = (int)($b['case_id'] ?? 0);
    $user_id = (int)($b['user_id'] ?? 0);

    if (!$case_id) json_err('case_id is required');
    if (!$user_id) json_err('user_id is required');

    // INSERT IGNORE: no error if already a member
    $pdo->prepare("
        INSERT IGNORE INTO case_members (case_id, user_id, role, invited_by)
        VALUES (?, ?, 'member', 1)
    ")->execute([$case_id, $user_id]);

    // Return the new member with user info
    $stmt = $pdo->prepare("
        SELECT cm.case_id, cm.user_id, cm.role, cm.joined_at,
               u.name, u.email, u.plan, u.avatar_url
        FROM case_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.case_id = ? AND cm.user_id = ?
    ");
    $stmt->execute([$case_id, $user_id]);

    json_ok($stmt->fetch());
}

/**
 * POST api.php?action=cases.remove_member
 * Body JSON: { "case_id": 1, "user_id": 2 }
 * Cannot remove the owner.
 */
function cases_remove_member(PDO $pdo)
{
    $b       = body();
    $case_id = (int)($b['case_id'] ?? 0);
    $user_id = (int)($b['user_id'] ?? 0);

    if (!$case_id) json_err('case_id is required');
    if (!$user_id) json_err('user_id is required');

    // Prevent removing the owner
    $check = $pdo->prepare("SELECT role FROM case_members WHERE case_id = ? AND user_id = ?");
    $check->execute([$case_id, $user_id]);
    $row = $check->fetch();

    if ($row && $row['role'] === 'owner') {
        json_err('Cannot remove the case owner');
    }

    $pdo->prepare("DELETE FROM case_members WHERE case_id = ? AND user_id = ?")
        ->execute([$case_id, $user_id]);

    json_ok(['removed' => true, 'user_id' => $user_id]);
}

/**
 * GET api.php?action=users.find_by_email&email=jose@firm.com
 * Finds a single user by exact email match.
 * Returns user info or 404 if not found.
 */
function users_find_by_email(PDO $pdo)
{
    $email = trim($_GET['email'] ?? '');
    if (!$email) json_err('email is required');

    $stmt = $pdo->prepare("
        SELECT id, name, email, plan, avatar_url
        FROM users
        WHERE email = ? AND is_active = 1
        LIMIT 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        json_err('User does not exist', 404);
    }

    json_ok($user);
}

/**
 * POST api.php?action=users.sync_firebase
 * Body JSON: { firebase_uid, email, name?, photo_url? }
 *
 * Demo: after Firebase login, upsert a row in `users` and return MySQL user_id.
 * Stores firebase_uid on first match; links by email if user existed without UID.
 */
function users_sync_firebase(PDO $pdo)
{
    $b            = body();
    $firebase_uid = trim($b['firebase_uid'] ?? '');
    $email        = trim($b['email'] ?? '');
    $name         = trim($b['name'] ?? '');
    $photo_url    = trim($b['photo_url'] ?? '');

    if ($firebase_uid === '' || $email === '') {
        json_err('firebase_uid and email are required');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_err('Invalid email');
    }

    $stmt = $pdo->prepare(
        'SELECT id, name, email, plan, avatar_url, firebase_uid FROM users WHERE firebase_uid = ? LIMIT 1'
    );
    $stmt->execute([$firebase_uid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        if ($photo_url !== '' && ($row['avatar_url'] === null || $row['avatar_url'] === '')) {
            $pdo->prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
                ->execute([$photo_url, (int)$row['id']]);
        }

        $uid = (int)$row['id'];
        $personal = cases_ensure_personal_case($pdo, $uid);

        json_ok([
            'user_id'       => $uid,
            'email'         => $row['email'],
            'name'          => $row['name'],
            'created'       => false,
            'personal_case' => $personal,
        ]);
    }

    $stmt = $pdo->prepare('SELECT id, name, email, avatar_url FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $byEmail = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($byEmail) {
        $id = (int)$byEmail['id'];
        $pdo->prepare(
            'UPDATE users SET firebase_uid = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?'
        )->execute([
            $firebase_uid,
            $photo_url !== '' ? $photo_url : null,
            $id,
        ]);

        $personal = cases_ensure_personal_case($pdo, $id);

        json_ok([
            'user_id'       => $id,
            'email'         => $email,
            'name'          => $byEmail['name'],
            'created'       => false,
            'linked'        => true,
            'personal_case' => $personal,
        ]);
    }

    $at = strpos($email, '@');
    $displayName = $name !== '' ? $name : ($at !== false ? substr($email, 0, $at) : $email);
    $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, firebase_uid, avatar_url, plan)
         VALUES (?, ?, ?, ?, ?, \'free\')'
    );
    $stmt->execute([
        $displayName,
        $email,
        $passwordHash,
        $firebase_uid,
        $photo_url !== '' ? $photo_url : null,
    ]);

    $newId = (int)$pdo->lastInsertId();
    $personal = cases_ensure_personal_case($pdo, $newId);

    json_ok([
        'user_id'       => $newId,
        'email'         => $email,
        'name'          => $displayName,
        'created'       => true,
        'personal_case' => $personal,
    ]);
}

/**
 * GET api.php?action=users.list
 * Returns all users (id, name, email, plan) for the invite picker.
 * Never returns password_hash.
 */
function users_list(PDO $pdo)
{
    $stmt = $pdo->query("
        SELECT id, name, email, plan, avatar_url, created_at
        FROM users
        WHERE is_active = 1
        ORDER BY name ASC
    ");

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=cases.delete
 * Body JSON: { "case_id": 1 }
 * Deletes the case (cascade removes conversations, messages, documents in DB)
 * and physically removes uploaded files.
 */
function cases_delete(PDO $pdo)
{
    $b       = body();
    $case_id = (int)($b['case_id'] ?? 0);
    if (!$case_id) json_err('case_id is required');

    // Gather file paths before cascade-delete
    $stmt = $pdo->prepare("SELECT file_path FROM documents WHERE case_id = ?");
    $stmt->execute([$case_id]);
    foreach ($stmt->fetchAll() as $doc) {
        $full = __DIR__ . DIRECTORY_SEPARATOR . $doc['file_path'];
        if (file_exists($full)) @unlink($full);
    }

    $pdo->prepare("DELETE FROM `cases` WHERE id = ?")->execute([$case_id]);

    json_ok(['deleted_id' => $case_id]);
}


// ═══════════════════════════════════════════════════════════
//  CONVERSATIONS
// ═══════════════════════════════════════════════════════════

/**
 * GET api.php?action=conversations.list&case_id=1
 * Returns all chats for a case, ordered by last activity.
 * Falls back to user_id filter if case_id is not provided.
 */
function conversations_list(PDO $pdo)
{
    $case_id = isset($_GET['case_id']) && $_GET['case_id'] !== '' ? (int)$_GET['case_id'] : null;
    $user_id = (int)($_GET['user_id'] ?? 1);

    if ($case_id) {
        $stmt = $pdo->prepare("
            SELECT
                c.id,
                c.case_id,
                c.title,
                c.is_pinned,
                c.created_at,
                c.updated_at,
                COUNT(m.id)       AS message_count,
                MAX(m.created_at) AS last_message_at
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.case_id = ?
            GROUP BY c.id
            ORDER BY c.is_pinned DESC, c.updated_at DESC
        ");
        $stmt->execute([$case_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT
                c.id,
                c.case_id,
                c.title,
                c.is_pinned,
                c.created_at,
                c.updated_at,
                COUNT(m.id)       AS message_count,
                MAX(m.created_at) AS last_message_at
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.is_pinned DESC, c.updated_at DESC
        ");
        $stmt->execute([$user_id]);
    }

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=conversations.create
 * Body JSON: { "user_id": 1, "case_id": 2, "title": "Lease Agreement" }
 */
function conversations_create(PDO $pdo)
{
    $b       = body();
    $user_id = (int)($b['user_id'] ?? 1);
    $case_id = isset($b['case_id']) && $b['case_id'] ? (int)$b['case_id'] : null;
    $title   = trim($b['title'] ?? 'New conversation');

    if (!$title) json_err('title is required');

    $stmt = $pdo->prepare(
        "INSERT INTO conversations (user_id, case_id, title) VALUES (?, ?, ?)"
    );
    $stmt->execute([$user_id, $case_id, $title]);

    $id = (int)$pdo->lastInsertId();

    // Auto-add creator as first conversation member
    $pdo->prepare("
        INSERT IGNORE INTO conversation_members (conversation_id, user_id)
        VALUES (?, ?)
    ")->execute([$id, $user_id]);

    json_ok([
        'id'           => $id,
        'user_id'      => $user_id,
        'case_id'      => $case_id,
        'title'        => $title,
        'is_pinned'    => 0,
        'member_count' => 1,
        'created_at'   => date('Y-m-d H:i:s'),
        'updated_at'   => date('Y-m-d H:i:s'),
    ]);
}

/**
 * GET api.php?action=conversations.members&conversation_id=1
 * Returns participants of a specific conversation with user info.
 */
function conversations_members(PDO $pdo)
{
    $conv_id = (int)($_GET['conversation_id'] ?? 0);
    if (!$conv_id) json_err('conversation_id is required');

    $stmt = $pdo->prepare("
        SELECT
            cm.conversation_id,
            cm.user_id,
            cm.joined_at,
            u.name,
            u.email,
            u.plan,
            u.avatar_url
        FROM conversation_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id = ?
        ORDER BY cm.joined_at ASC
    ");
    $stmt->execute([$conv_id]);

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=conversations.add_member
 * Body JSON: { "conversation_id": 1, "user_id": 2 }
 * User must already be a member of the case.
 */
function conversations_add_member(PDO $pdo)
{
    $b       = body();
    $conv_id = (int)($b['conversation_id'] ?? 0);
    $user_id = (int)($b['user_id']         ?? 0);

    if (!$conv_id) json_err('conversation_id is required');
    if (!$user_id) json_err('user_id is required');

    $pdo->prepare("
        INSERT IGNORE INTO conversation_members (conversation_id, user_id)
        VALUES (?, ?)
    ")->execute([$conv_id, $user_id]);

    // Return the new member with user info
    $stmt = $pdo->prepare("
        SELECT cm.conversation_id, cm.user_id, cm.joined_at,
               u.name, u.email, u.plan, u.avatar_url
        FROM conversation_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id = ? AND cm.user_id = ?
    ");
    $stmt->execute([$conv_id, $user_id]);

    json_ok($stmt->fetch());
}

/**
 * POST api.php?action=conversations.remove_member
 * Body JSON: { "conversation_id": 1, "user_id": 2 }
 * Cannot remove user_id=1 (hardcoded owner for MVP).
 */
function conversations_remove_member(PDO $pdo)
{
    $b       = body();
    $conv_id = (int)($b['conversation_id'] ?? 0);
    $user_id = (int)($b['user_id']         ?? 0);

    if (!$conv_id) json_err('conversation_id is required');
    if (!$user_id) json_err('user_id is required');
    if ($user_id === 1) json_err('Cannot remove the conversation creator');

    $pdo->prepare("
        DELETE FROM conversation_members
        WHERE conversation_id = ? AND user_id = ?
    ")->execute([$conv_id, $user_id]);

    json_ok(['removed' => true, 'user_id' => $user_id]);
}

/**
 * POST api.php?action=conversations.rename
 * Body JSON: { "conversation_id": 1, "title": "New title" }
 */
function conversations_rename(PDO $pdo)
{
    $b     = body();
    $id    = (int)($b['conversation_id'] ?? 0);
    $title = trim($b['title'] ?? '');

    if (!$id)    json_err('conversation_id is required');
    if (!$title) json_err('title is required');

    $pdo->prepare("UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?")
        ->execute([$title, $id]);

    json_ok(['id' => $id, 'title' => $title]);
}

/**
 * POST api.php?action=conversations.delete
 * Body JSON: { "conversation_id": 5 }
 */
function conversations_delete(PDO $pdo)
{
    $b  = body();
    $id = (int)($b['conversation_id'] ?? 0);

    if (!$id) json_err('conversation_id is required');

    $pdo->prepare("DELETE FROM conversations WHERE id = ?")->execute([$id]);

    json_ok(['deleted_id' => $id]);
}


// ═══════════════════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════════════════

/**
 * GET api.php?action=messages.list&conversation_id=1
 */
function messages_list(PDO $pdo)
{
    $conv_id = (int)($_GET['conversation_id'] ?? 0);
    if (!$conv_id) json_err('conversation_id is required');

    $stmt = $pdo->prepare("
        SELECT
            m.id,
            m.conversation_id,
            m.role,
            m.content,
            m.document_id,
            m.tokens_used,
            m.ai_model,
            m.created_at,
            d.original_name AS doc_name
        FROM messages m
        LEFT JOIN documents d ON d.id = m.document_id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
    ");
    $stmt->execute([$conv_id]);

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=messages.send
 * Body JSON: { "conversation_id": 1, "content": "...", "document_id": null, "case_id": 2 }
 */
function messages_send(PDO $pdo)
{
    $b             = body();
    $conv_id       = (int)($b['conversation_id'] ?? 0);
    $content       = trim($b['content'] ?? '');
    $document_id   = isset($b['document_id']) && $b['document_id'] ? (int)$b['document_id'] : null;
    $case_id       = isset($b['case_id'])     && $b['case_id']     ? (int)$b['case_id']     : null;
    $knowledge_src = trim($b['knowledge_src'] ?? '');

    if (!$conv_id) json_err('conversation_id is required');
    if (!$content) json_err('content is required');

    // 1. Save user message
    $stmt = $pdo->prepare("
        INSERT INTO messages (conversation_id, role, content, document_id)
        VALUES (?, 'user', ?, ?)
    ");
    $stmt->execute([$conv_id, $content, $document_id]);
    $user_msg_id  = (int)$pdo->lastInsertId();
    $user_created = date('Y-m-d H:i:s');

    $pdo->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?")
        ->execute([$conv_id]);

    // 2. Determine if AI should respond
    //    — Solo 1 miembro: siempre responde
    //    — @Waldy logic is conversation-level (not case-level)
    //      Count members of THIS conversation specifically.
    //      Legacy convs with no records default to 1 → AI always responds.
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM conversation_members WHERE conversation_id = ?");
    $cnt->execute([$conv_id]);
    $member_count = (int)$cnt->fetchColumn();
    if ($member_count === 0) $member_count = 1;

    $ai_mention     = '@waldy';
    $should_respond = ($member_count <= 1) || (stripos($content, $ai_mention) !== false);

    // 3. Call OpenAI only when needed
    if (!$should_respond) {
        json_ok([
            'user_message' => [
                'id'              => $user_msg_id,
                'conversation_id' => $conv_id,
                'role'            => 'user',
                'content'         => $content,
                'document_id'     => $document_id,
                'created_at'      => $user_created,
            ],
            'ai_message'   => null,
            'member_count' => $member_count,
        ]);
    }

    // ── Always: search conversation document chunks ────────
    $doc_research     = search_conversation_docs($pdo, $conv_id, $content);
    $external_context = $doc_research['context'];

    // ── On request: Court Listener external case search ────
    $cl_sources = [];
    $cl_meta    = null;
    if ($knowledge_src === 'court_listener') {
        $research   = courtlistener_research($content);
        $cl_sources = $research['sources'];
        $cl_meta    = empty($research['skipped']) ? [
            'searched'     => true,
            'terms'        => $research['terms'],
            'result_count' => $research['result_count'],
            'context_len'  => mb_strlen($research['context']),
        ] : ['searched' => false, 'skipped' => true];

        // Merge: doc passages first, then external cases
        if ($research['context']) {
            $external_context = $external_context
                ? $external_context . "\n\n" . $research['context']
                : $research['context'];
        }
    }

    $ai = openai_chat($pdo, $conv_id, $content, $case_id, $external_context);

    // 4. Save assistant response
    $stmt2 = $pdo->prepare("
        INSERT INTO messages (conversation_id, role, content, ai_model, tokens_used)
        VALUES (?, 'assistant', ?, ?, ?)
    ");
    $stmt2->execute([$conv_id, $ai['content'], $ai['model'], $ai['tokens']]);
    $ai_msg_id  = (int)$pdo->lastInsertId();
    $ai_created = date('Y-m-d H:i:s');

    // 5. Return both messages
    json_ok([
        'user_message' => [
            'id'              => $user_msg_id,
            'conversation_id' => $conv_id,
            'role'            => 'user',
            'content'         => $content,
            'document_id'     => $document_id,
            'created_at'      => $user_created,
        ],
        'ai_message' => [
            'id'              => $ai_msg_id,
            'conversation_id' => $conv_id,
            'role'            => 'assistant',
            'content'         => $ai['content'],
            'ai_model'        => $ai['model'],
            'tokens_used'     => $ai['tokens'],
            'created_at'      => $ai_created,
            'cl_sources'      => $cl_sources,
            'cl_meta'         => $cl_meta,
        ],
        'member_count' => $member_count,
    ]);
}


// ═══════════════════════════════════════════════════════════
//  DOCUMENTS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  DOCUMENT EDITOR
// ═══════════════════════════════════════════════════════════

/**
 * GET api.php?action=documents.get&id=5
 * Returns full document row including extracted_text for editing.
 */
function documents_get(PDO $pdo)
{
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_err('id is required');

    $stmt = $pdo->prepare("
        SELECT id, original_name, file_size, status, page_count, created_at,
               extracted_text
        FROM documents
        WHERE id = ?
    ");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if (!$doc) json_err('Document not found', 404);

    json_ok($doc);
}

/**
 * POST api.php?action=documents.save_text
 * Body: { id, html }
 * Saves rich-text HTML into extracted_text.
 * The AI layer uses strip_tags() when building context, so HTML tags are ignored.
 */
function documents_save_text(PDO $pdo)
{
    $b    = body();
    $id   = (int)($b['id']   ?? 0);
    $html = $b['html'] ?? '';

    if (!$id) json_err('id is required');

    $pdo->prepare("UPDATE documents SET extracted_text = ? WHERE id = ?")
        ->execute([$html, $id]);

    json_ok(['id' => $id, 'saved' => true]);
}


// ═══════════════════════════════════════════════════════════
//  AI DOCUMENT EDITOR
// ═══════════════════════════════════════════════════════════

/**
 * POST api.php?action=documents.ai_edit
 * Body: { doc_id, instruction }
 *
 * Sends the document's extracted text to OpenAI with an edit instruction.
 * Returns the original text and the AI-edited version for the diff viewer.
 */
function documents_ai_edit(PDO $pdo)
{
    $b           = body();
    $doc_id      = (int)trim($b['doc_id']      ?? '0');
    $instruction = trim($b['instruction'] ?? '');

    if (!$doc_id)      json_err('doc_id is required');
    if (!$instruction) json_err('instruction is required');

    // ── 1. Fetch document ─────────────────────────────────
    $stmt = $pdo->prepare(
        'SELECT id, original_name, extracted_text FROM documents WHERE id = ?'
    );
    $stmt->execute([$doc_id]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$doc) {
        json_err('Document not found');
    }

    // Strip HTML tags in case the document was saved as rich HTML (blank docs OK)
    $plain_text = trim(strip_tags((string)($doc['extracted_text'] ?? '')));
    $is_blank     = ($plain_text === '');

    // ── 2. Build OpenAI prompt ────────────────────────────
    $blank_mode_note = $is_blank
        ? "\n\n═══ BLANK DOCUMENT MODE ═══\n"
        . "The document body is currently EMPTY (new/blank file). The user's instruction describes "
        . "what to draft or generate. Produce a COMPLETE legal document from scratch that follows "
        . "their request. Use the file name as optional context only if helpful.\n"
        : '';

    /* Non-blank: surgical edits only — do not "improve" unrelated parts of the document */
    $surgical_rules = !$is_blank
        ? "═══ CRITICAL — SURGICAL EDITS ONLY (HIGHEST PRIORITY) ═══\n"
        . "The user will give ONE edit instruction. You must change ONLY what is required to satisfy it.\n"
        . "- Do NOT rephrase, polish, or \"improve\" text that the instruction does not target.\n"
        . "- Do NOT fix grammar, spelling, tone, or legal style in unrelated paragraphs.\n"
        . "- Do NOT change titles, headings, numbering, indentation, line breaks, or spacing except "
        . "where you must insert or replace text to fulfill the instruction.\n"
        . "- Do NOT reformat, re-indent, or restructure sections the instruction does not mention.\n"
        . "- If the user asks to ADD a clause (or similar), INSERT only that content in the right place "
        . "and leave the rest of the document unchanged — same wording, same layout, same order.\n"
        . "- If the user asks to CHANGE one part, alter ONLY that part; copy the remainder verbatim.\n"
        . "- Broad rewrites are allowed ONLY if the instruction explicitly asks (e.g. \"rewrite the entire "
        . "agreement\", \"reformat the whole document\", \"translate everything\").\n"
        . "- When in doubt, make the SMALLEST change that satisfies the instruction.\n"
        . "You still return the FULL document text after the edit (for versioning), but unchanged "
        . "sections must remain identical to the original except for unavoidable context around an insertion.\n\n"
        : '';

    $formatting_rules =
                "═══ FORMATTING / MARKUP (plain text) ═══\n"
                . "The renderer supports inline markup:\n"
                . "  ***text***  bold + italic   **text**  bold   *text*  italic\n\n"
                . ($is_blank
                    ? "For a NEW draft, use consistent structure: paragraphs separated by blank lines; "
                    . "headings on their own line; numbered clauses as needed. Apply markup where it helps readability.\n\n"
                    : "Apply the markup rules ONLY to NEW or REPLACED text you write for this edit. "
                    . "Do NOT add or change markup in passages you are supposed to leave untouched.\n"
                    . "Keep existing markup and punctuation in unchanged regions exactly as in the original.\n\n");

    $output_rules =
                "═══ OUTPUT RULES ═══\n"
                . "  - Return ONLY the document text — no preamble, no explanation, no metadata.\n"
                . "  - Do NOT wrap the output in code fences or quotes.\n"
                . ($is_blank
                    ? "  - Draft all sections the instruction implies.\n"
                    : "  - Preserve every sentence and line not implicated by the instruction; do not \"clean up\" the rest.\n")
                . ($is_blank
                    ? ""
                    : "  - Legal meaning of untouched clauses must not change.\n");

    $system_rules =
                ($is_blank
                    ? "You are a precise legal document drafter. Draft the full text from the user's instruction.\n"
                    : "You are a surgical legal document editor. Follow the user's instruction exactly; do nothing else.\n")
                . $blank_mode_note
                . $surgical_rules
                . $formatting_rules
                . $output_rules;

    $messages = [
        [
            'role'    => 'system',
            'content' => $system_rules,
        ],
        [
            'role'    => 'user',
            'content' => $is_blank
                ? "DOCUMENT FILE NAME (context only): {$doc['original_name']}\n\n"
                . "DOCUMENT BODY: (empty — generate from the instruction below)\n\n"
                . "INSTRUCTION:\n{$instruction}"
                : "FULL DOCUMENT (copy unchanged parts verbatim; edit ONLY what the instruction requires):\n{$plain_text}\n\n"
                . "EDIT INSTRUCTION — apply only this; do not modify anything else:\n{$instruction}",
        ],
    ];

    // ── 3. Call Ollama ────────────────────────────────────
    @set_time_limit(OLLAMA_TIMEOUT + 60);
    @ini_set('max_execution_time', (string)(OLLAMA_TIMEOUT + 60));

    $payload = [
        'model'    => OLLAMA_MODEL,
        'messages' => $messages,
        'stream'   => false,
    ];

    $ch = curl_init(OLLAMA_CHAT_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => OLLAMA_TIMEOUT,
    ]);
    $raw      = curl_exec($ch);
    $curl_err = curl_error($ch);
    curl_close($ch);

    if ($raw === false) json_err("Ollama connection error: $curl_err");

    $result      = json_decode($raw, true);
    $edited_text = trim($result['message']['content'] ?? '');

    if (!$edited_text) {
        $api_err = $result['error'] ?? 'Unknown error';
        json_err("Ollama did not return edited text: $api_err");
    }

    json_ok([
        'doc_id'        => $doc_id,
        'doc_name'      => $doc['original_name'],
        'original_text' => $plain_text,
        'edited_text'   => $edited_text,
    ]);
}


// ═══════════════════════════════════════════════════════════
//  FOLDERS  (mini-drive)
// ═══════════════════════════════════════════════════════════

/**
 * GET api.php?action=folders.list&case_id=1&parent_id=  (empty = root)
 * Returns folders at a given level with child counts.
 */
function folders_list(PDO $pdo)
{
    $case_id   = isset($_GET['case_id'])   && $_GET['case_id']   !== '' ? (int)$_GET['case_id']   : null;
    $parent_id = isset($_GET['parent_id']) && $_GET['parent_id'] !== '' ? (int)$_GET['parent_id'] : null;

    $where_case   = $case_id   !== null ? 'f.case_id = ?'   : 'f.case_id IS NULL';
    $where_parent = $parent_id !== null ? 'f.parent_id = ?' : 'f.parent_id IS NULL';

    $sql = "
        SELECT
            f.id,
            f.name,
            f.parent_id,
            f.created_at,
            (SELECT COUNT(*) FROM folders   sf WHERE sf.parent_id = f.id)  AS subfolder_count,
            (SELECT COUNT(*) FROM documents  d WHERE d.folder_id  = f.id)  AS file_count
        FROM folders f
        WHERE $where_case AND $where_parent
        ORDER BY f.name ASC
    ";

    $params = [];
    if ($case_id   !== null) $params[] = $case_id;
    if ($parent_id !== null) $params[] = $parent_id;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=folders.create
 * Body: { case_id, parent_id (null=root), name, user_id }
 */
function folders_create(PDO $pdo)
{
    $b         = body();
    $case_id   = ($b['case_id']   ?? '') !== '' ? (int)$b['case_id']   : null;
    $parent_id = ($b['parent_id'] ?? '') !== '' ? (int)$b['parent_id'] : null;
    $name      = trim($b['name']  ?? '');
    $user_id   = (int)($b['user_id'] ?? 1);

    if (!$name) json_err('name is required');

    $pdo->prepare("INSERT INTO folders (case_id, parent_id, name, created_by) VALUES (?, ?, ?, ?)")
        ->execute([$case_id, $parent_id, $name, $user_id]);

    json_ok([
        'id'              => (int)$pdo->lastInsertId(),
        'name'            => $name,
        'case_id'         => $case_id,
        'parent_id'       => $parent_id,
        'subfolder_count' => 0,
        'file_count'      => 0,
        'created_at'      => date('Y-m-d H:i:s'),
    ]);
}

/**
 * POST api.php?action=folders.rename
 * Body: { id, name }
 */
function folders_rename(PDO $pdo)
{
    $b    = body();
    $id   = (int)($b['id']   ?? 0);
    $name = trim($b['name']  ?? '');

    if (!$id || !$name) json_err('id and name are required');

    $pdo->prepare("UPDATE folders SET name = ? WHERE id = ?")->execute([$name, $id]);

    json_ok(['id' => $id, 'name' => $name]);
}

/**
 * POST api.php?action=folders.delete
 * Body: { id }
 * Cascade: sub-folders deleted, documents have folder_id SET NULL.
 */
function folders_delete(PDO $pdo)
{
    $b  = body();
    $id = (int)($b['id'] ?? 0);
    if (!$id) json_err('id is required');

    $pdo->prepare("DELETE FROM folders WHERE id = ?")->execute([$id]);

    json_ok(['deleted_id' => $id]);
}


/**
 * POST api.php?action=documents.upload  (multipart/form-data)
 * Fields: file, user_id, case_id (optional), conversation_id (optional)
 */
function documents_upload(PDO $pdo)
{
    if (empty($_FILES['file'])) {
        json_err('No file received. Use multipart/form-data with field name "file"');
    }

    $file    = $_FILES['file'];
    $conv_id   = ($_POST['conversation_id'] ?? '') !== '' ? (int)$_POST['conversation_id'] : null;
    $case_id   = ($_POST['case_id']         ?? '') !== '' ? (int)$_POST['case_id']          : null;
    $folder_id = ($_POST['folder_id']       ?? '') !== '' ? (int)$_POST['folder_id']        : null;
    $user_id   = (int)($_POST['user_id'] ?? 1);

    // Validate upload error
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $upload_errors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds upload_max_filesize in php.ini',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds MAX_FILE_SIZE in form',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        ];
        json_err($upload_errors[$file['error']] ?? 'Unknown upload error');
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'docx') {
        json_err('Only .docx files are supported at this time');
    }

    $upload_dir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $safe_name   = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
    $stored_name = uniqid('doc_', true) . '_' . $safe_name;
    $dest_path   = $upload_dir . $stored_name;

    if (!move_uploaded_file($file['tmp_name'], $dest_path)) {
        json_err('Could not move uploaded file to destination', 500);
    }

    $extracted_text = extract_docx_text($dest_path);
    $char_count     = mb_strlen($extracted_text);

    $stmt = $pdo->prepare("
        INSERT INTO documents
            (case_id, folder_id, conversation_id, user_id, original_name, stored_name, file_path,
             file_size, file_type, status, extracted_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $case_id,
        $folder_id,
        $conv_id,
        $user_id,
        $file['name'],
        $stored_name,
        'uploads/' . $stored_name,
        $file['size'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'ready',
        $extracted_text,
    ]);

    $doc_id = (int)$pdo->lastInsertId();

    // Populate RAG chunks for later full-text search
    populate_document_chunks($pdo, $doc_id, $extracted_text);

    json_ok([
        'id'           => $doc_id,
        'original_name'=> $file['name'],
        'stored_name'  => $stored_name,
        'file_size'    => $file['size'],
        'char_count'   => $char_count,
        'status'       => 'ready',
        'text_preview' => mb_substr($extracted_text, 0, 400) . ($char_count > 400 ? '…' : ''),
    ]);
}

/**
 * POST api.php?action=documents.create_empty
 * Body JSON: { user_id, case_id, folder_id? (omit or 0 = root), title? }
 * Creates a placeholder file on disk and a ready row with empty extracted_text (rich editor).
 */
function documents_create_empty(PDO $pdo)
{
    $b         = body();
    $user_id   = (int)($b['user_id'] ?? 1);
    $case_id   = isset($b['case_id']) && $b['case_id'] !== '' ? (int)$b['case_id'] : 0;
    $folder_raw = $b['folder_id'] ?? null;
    $folder_id = ($folder_raw === null || $folder_raw === '' || (int)$folder_raw === 0)
        ? null
        : (int)$folder_raw;
    $title = trim($b['title'] ?? '');

    if (!$case_id) {
        json_err('case_id is required');
    }

    if ($title === '') {
        $title = 'Untitled document';
    }
    $original_name = $title;
    if (!preg_match('/\.[a-z0-9]{2,8}$/i', $original_name)) {
        $original_name .= '.docx';
    }

    $upload_dir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $stored_name = 'empty_' . uniqid('', true) . '.txt';
    $dest_path   = $upload_dir . $stored_name;
    if (file_put_contents($dest_path, '') === false) {
        json_err('Could not create placeholder file', 500);
    }

    $rel_path = 'uploads/' . $stored_name;

    $stmt = $pdo->prepare("
        INSERT INTO documents
            (case_id, folder_id, conversation_id, user_id, original_name, stored_name, file_path,
             file_size, file_type, status, extracted_text)
        VALUES (?, ?, NULL, ?, ?, ?, ?, 0, 'application/x-empty', 'ready', '')
    ");
    $stmt->execute([
        $case_id,
        $folder_id,
        $user_id,
        $original_name,
        $stored_name,
        $rel_path,
    ]);

    $doc_id = (int)$pdo->lastInsertId();

    json_ok([
        'id'            => $doc_id,
        'original_name' => $original_name,
        'file_size'     => 0,
        'char_count'    => 0,
        'status'        => 'ready',
    ]);
}

/**
 * GET api.php?action=documents.list&conversation_id=1
 */
function documents_list(PDO $pdo)
{
    $conv_id = (int)($_GET['conversation_id'] ?? 0);
    if (!$conv_id) json_err('conversation_id is required');

    $stmt = $pdo->prepare("
        SELECT DISTINCT d.id, d.original_name, d.file_size, d.file_type, d.status,
               d.page_count, d.created_at,
               CHAR_LENGTH(d.extracted_text) AS char_count
        FROM documents d
        LEFT JOIN messages m ON m.document_id = d.id AND m.conversation_id = :conv2
        WHERE d.conversation_id = :conv1 OR m.id IS NOT NULL
        ORDER BY d.created_at ASC
    ");
    $stmt->execute([':conv1' => $conv_id, ':conv2' => $conv_id]);

    json_ok($stmt->fetchAll());
}

/**
 * GET api.php?action=documents.list_all
 * Params:
 *   case_id   — scope to case (or user_id fallback)
 *   folder_id — filter by folder:
 *               omitted / 'all' → no folder filter (list everything)
 *               0 or ''         → root level (folder_id IS NULL)
 *               N               → inside folder N
 */
function documents_list_all(PDO $pdo)
{
    $case_id = isset($_GET['case_id']) && $_GET['case_id'] !== '' ? (int)$_GET['case_id'] : null;
    $user_id = (int)($_GET['user_id'] ?? 1);

    // folder_id filter
    $folder_raw = $_GET['folder_id'] ?? 'all';
    if ($folder_raw === 'all' || $folder_raw === '') {
        $folder_clause = '';
        $folder_params = [];
    } elseif ((int)$folder_raw === 0) {
        $folder_clause = ' AND d.folder_id IS NULL';
        $folder_params = [];
    } else {
        $folder_clause = ' AND d.folder_id = ?';
        $folder_params = [(int)$folder_raw];
    }

    $select = "
        SELECT
            d.id,
            d.folder_id,
            d.original_name,
            d.file_size,
            d.file_type,
            d.status,
            d.page_count,
            d.created_at,
            d.conversation_id,
            CHAR_LENGTH(d.extracted_text) AS char_count,
            c.title AS conversation_title,
            f.name  AS folder_name
        FROM documents d
        LEFT JOIN conversations c ON c.id = d.conversation_id
        LEFT JOIN folders       f ON f.id = d.folder_id
    ";

    if ($case_id) {
        $stmt = $pdo->prepare($select . " WHERE d.case_id = ?$folder_clause ORDER BY d.created_at DESC");
        $stmt->execute(array_merge([$case_id], $folder_params));
    } else {
        $stmt = $pdo->prepare($select . " WHERE d.user_id = ?$folder_clause ORDER BY d.created_at DESC");
        $stmt->execute(array_merge([$user_id], $folder_params));
    }

    json_ok($stmt->fetchAll());
}

/**
 * POST api.php?action=documents.delete
 * Body JSON: { "document_id": 5 }
 */
function documents_delete(PDO $pdo)
{
    $b      = body();
    $doc_id = (int)($b['document_id'] ?? 0);
    if (!$doc_id) json_err('document_id is required');

    $stmt = $pdo->prepare("SELECT file_path FROM documents WHERE id = ?");
    $stmt->execute([$doc_id]);
    $doc = $stmt->fetch();

    if (!$doc) json_err('Document not found', 404);

    $full_path = __DIR__ . DIRECTORY_SEPARATOR . $doc['file_path'];
    if (file_exists($full_path)) {
        @unlink($full_path);
    }

    $pdo->prepare("DELETE FROM documents WHERE id = ?")->execute([$doc_id]);

    json_ok(['deleted_id' => $doc_id]);
}


// ═══════════════════════════════════════════════════════════
//  EXPORT — Build .docx from extracted_text (HTML or plain)
// ═══════════════════════════════════════════════════════════

/**
 * GET api.php?action=documents.export_docx&document_id=1
 * Streams a Word .docx built from stored extracted_text.
 */
function documents_export_docx(PDO $pdo): void
{
    $doc_id = (int)($_GET['document_id'] ?? $_GET['id'] ?? 0);
    if (!$doc_id) {
        json_err('document_id is required');
    }

    $stmt = $pdo->prepare('SELECT id, original_name, extracted_text FROM documents WHERE id = ?');
    $stmt->execute([$doc_id]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$doc) {
        json_err('Document not found', 404);
    }

    $html = (string)($doc['extracted_text'] ?? '');
    $paragraphs = legaltek_paragraphs_from_extracted_html($html);
    $documentXml = legaltek_build_word_document_xml($paragraphs);
    $bytes = legaltek_pack_docx_zip($documentXml);

    if ($bytes === '' || $bytes === false) {
        json_err('Could not build DOCX file', 500);
    }

    $fname = (string)$doc['original_name'];
    if ($fname === '') {
        $fname = 'document.docx';
    } elseif (!preg_match('/\.docx$/i', $fname)) {
        $fname = preg_replace('/\.[^.]+$/u', '', $fname);
        if ($fname === '') {
            $fname = 'document';
        }
        $fname .= '.docx';
    }

    $asciiName = preg_replace('/[^\x20-\x7E]/', '_', $fname);

    header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    header('Content-Disposition: attachment; filename="' . $asciiName . '"; filename*=UTF-8\'\'' . rawurlencode($fname));
    header('Content-Length: ' . (string)strlen($bytes));
    header('Cache-Control: private, max-age=0');
    header('Access-Control-Allow-Origin: *');
    echo $bytes;
}

/** Split editor HTML / plain text into paragraph blocks for Word */
function legaltek_paragraphs_from_extracted_html(string $html): array
{
    $html = trim($html);
    if ($html === '') {
        return [''];
    }

    $html = preg_replace('/<\/(p|div|h[1-6]|section|article|li)\s*>/iu', "\n\n", $html);
    $html = preg_replace('/<br\s*\/?>/iu', "\n", $html);
    $plain = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $plain = str_replace(["\r\n", "\r"], "\n", $plain);
    $blocks = preg_split('/\n\s*\n+/u', $plain);
    $blocks = array_map(static fn ($b) => trim((string)$b), $blocks);
    $blocks = array_values(array_filter($blocks, static fn ($b) => $b !== ''));

    return $blocks !== [] ? $blocks : [''];
}

/** Build word/document.xml body */
function legaltek_build_word_document_xml(array $paragraphs): string
{
    $body = '';
    foreach ($paragraphs as $p) {
        $lines = explode("\n", $p);
        foreach ($lines as $line) {
            $safe = htmlspecialchars($line, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $body .= '<w:p><w:r><w:t xml:space="preserve">' . $safe . '</w:t></w:r></w:p>';
        }
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        . 'xmlns:xml="http://www.w3.org/XML/1998/namespace">'
        . '<w:body>' . $body
        . '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        . '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        . '</w:sectPr></w:body></w:document>';
}

/** Pack minimal OOXML parts into a .docx byte string */
function legaltek_pack_docx_zip(string $documentXml): string
{
    if (!class_exists('ZipArchive')) {
        return '';
    }

    $tmp = tempnam(sys_get_temp_dir(), 'ltk_docx_');
    if ($tmp === false) {
        return '';
    }

    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::OVERWRITE | ZipArchive::CREATE) !== true) {
        @unlink($tmp);

        return '';
    }

    $zip->addFromString('[Content_Types].xml', legaltek_ooxml_content_types());
    $zip->addFromString('_rels/.rels', legaltek_ooxml_rels_root());
    $zip->addFromString('word/document.xml', $documentXml);
    $zip->addFromString('word/_rels/document.xml.rels', legaltek_ooxml_rels_document());
    $zip->addFromString('word/styles.xml', legaltek_ooxml_styles());
    $zip->addFromString('word/settings.xml', legaltek_ooxml_settings());
    $zip->addFromString('word/fontTable.xml', legaltek_ooxml_font_table());
    $zip->addFromString('docProps/core.xml', legaltek_ooxml_core_props());
    $zip->addFromString('docProps/app.xml', legaltek_ooxml_app_props());
    $zip->close();

    $bytes = file_get_contents($tmp);
    @unlink($tmp);

    return $bytes !== false ? $bytes : '';
}

function legaltek_ooxml_content_types(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        . '<Default Extension="xml" ContentType="application/xml"/>'
        . '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        . '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        . '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
        . '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>'
        . '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        . '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        . '</Types>';
}

function legaltek_ooxml_rels_root(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        . '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        . '</Relationships>';
}

function legaltek_ooxml_rels_document(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
        . '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>'
        . '</Relationships>';
}

function legaltek_ooxml_styles(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        . '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
        . '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
        . '</w:styles>';
}

function legaltek_ooxml_settings(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>';
}

function legaltek_ooxml_font_table(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        . '<w:font w:name="Calibri"><w:panose1 w:val="020F0502020204030204"/>'
        . '<w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/>'
        . '<w:sig w:usb0="E1002EFF" w:usb1="C000247B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/></w:font>'
        . '</w:fonts>';
}

function legaltek_ooxml_core_props(): string
{
    $now = gmdate('c');

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        . 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        . 'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        . '<dc:title>LegalTek export</dc:title><dc:creator>LegalTek AI</dc:creator>'
        . '<cp:lastModifiedBy>LegalTek AI</cp:lastModifiedBy>'
        . '<dcterms:created xsi:type="dcterms:W3CDTF">' . $now . '</dcterms:created>'
        . '<dcterms:modified xsi:type="dcterms:W3CDTF">' . $now . '</dcterms:modified>'
        . '</cp:coreProperties>';
}

function legaltek_ooxml_app_props(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        . 'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        . '<Application>LegalTek AI</Application></Properties>';
}


// ═══════════════════════════════════════════════════════════
//  HELPER — Keyword relevance scorer
// ═══════════════════════════════════════════════════════════
function score_document_relevance(string $query, string $doc_text, bool $is_conv_doc): float
{
    static $stop_words = [
        'the','a','an','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','can',
        'could','should','may','might','shall','must','need','ought',
        'and','or','but','nor','so','yet','for','in','on','at','to',
        'of','with','by','from','as','into','through','about','above',
        'after','before','between','out','over','under','again','then',
        'once','here','there','when','where','why','how','all','each',
        'few','more','most','other','some','such','than','too','very',
        'just','that','this','these','those','what','which','who',
        'whom','i','me','my','we','our','you','your','he','him','his',
        'she','her','it','its','they','them','their','not','no','if',
        'any','also','only','even','both','same','own','up','off',
        'el','la','los','las','un','una','unos','unas','de','del',
        'en','con','por','para','que','se','es','son','fue','era',
        'hay','tiene','me','te','le','nos','su','mi','tu','lo','si',
        'al','mas','como','pero','sin','sobre','entre','hasta','desde',
        'ante','bajo','cada','esto','esta','estos','estas','ese','esa',
        'eso','esos','esas','aquel','aqui','alli','ya','no','ni','o',
        'muy','bien','aqui','cuando','donde','quien','cual','cuales',
    ];

    $query = trim($query);
    if ($query === '' || $doc_text === '') {
        return $is_conv_doc ? 0.6 : 0.0;
    }

    if ($query === '(Document sent for analysis)') {
        return $is_conv_doc ? 1.0 : 0.0;
    }

    preg_match_all('/[a-záéíóúüñ\w]{3,}/iu', mb_strtolower($query), $m);
    $keywords = array_unique(array_filter(
        $m[0],
        fn($w) => !in_array($w, $stop_words, true)
    ));

    if (empty($keywords)) {
        return $is_conv_doc ? 0.6 : 0.0;
    }

    $doc_lower = mb_strtolower($doc_text);
    $hits = 0;
    foreach ($keywords as $kw) {
        if (mb_strpos($doc_lower, $kw) !== false) {
            $hits++;
        }
    }

    $score = $hits / count($keywords);
    if ($is_conv_doc) {
        $score += 0.6;
    }

    return $score;
}


// ═══════════════════════════════════════════════════════════
//  OPENAI INTEGRATION
//
//  When case_id is provided, documents are scoped to the case.
//  Falls back to user-level document search otherwise.
// ═══════════════════════════════════════════════════════════
function openai_chat(PDO $pdo, int $conv_id, string $user_question = '', ?int $case_id = null, string $external_context = ''): array
{
    return ollama_chat($pdo, $conv_id, $user_question, $case_id, $external_context);
}

function ollama_chat(PDO $pdo, int $conv_id, string $user_question = '', ?int $case_id = null, string $external_context = ''): array
{
    // Get user_id from the conversation
    $u_stmt = $pdo->prepare("SELECT user_id FROM conversations WHERE id = ?");
    $u_stmt->execute([$conv_id]);
    $user_id = (int)($u_stmt->fetchColumn() ?: 1);

    $total_budget = OLLAMA_DOC_MAX_CHARS;
    $doc_blocks   = [];

    // ── 1) Every document uploaded in THIS conversation (shared context for the AI) ──
    $conv_stmt = $pdo->prepare("
        SELECT id, original_name, extracted_text
        FROM documents
        WHERE conversation_id = ?
          AND status = 'ready'
          AND extracted_text IS NOT NULL
          AND extracted_text != ''
        ORDER BY created_at ASC, id ASC
    ");
    $conv_stmt->execute([$conv_id]);
    $conv_docs = $conv_stmt->fetchAll(PDO::FETCH_ASSOC);

    $from_conversation = count($conv_docs) > 0;

    if ($from_conversation) {
        $n       = count($conv_docs);
        $overhead = 100 * $n;
        $avail    = max(0, $total_budget - $overhead);
        $per_doc  = $n > 0 ? (int) floor($avail / $n) : 0;

        foreach ($conv_docs as $doc) {
            $full  = strip_tags((string) $doc['extracted_text']);
            $len   = mb_strlen($full);
            $take  = $per_doc > 0 ? min($len, $per_doc) : min($len, 8000);
            $text  = mb_substr($full, 0, $take);
            $trunc = $len > $take;

            $block = "\n\n── ★ {$doc['original_name']} (this conversation) ──\n{$text}";
            if ($trunc) {
                $block .= "\n[... truncated ...]";
            }
            $doc_blocks[] = $block;
        }
    } else {
        // ── 2) Fallback: case / user document pool, ranked by relevance ──
        if ($case_id) {
            $doc_stmt = $pdo->prepare("
                SELECT id,
                       original_name,
                       extracted_text,
                       (conversation_id = :cid) AS is_conv_doc
                FROM   documents
                WHERE  case_id = :caseId
                  AND  status  = 'ready'
                  AND  extracted_text IS NOT NULL
                  AND  extracted_text != ''
                ORDER  BY created_at DESC
            ");
            $doc_stmt->execute([':cid' => $conv_id, ':caseId' => $case_id]);
        } else {
            $doc_stmt = $pdo->prepare("
                SELECT id,
                       original_name,
                       extracted_text,
                       (conversation_id = :cid) AS is_conv_doc
                FROM   documents
                WHERE  user_id = :uid
                  AND  status  = 'ready'
                  AND  extracted_text IS NOT NULL
                  AND  extracted_text != ''
                ORDER  BY created_at DESC
            ");
            $doc_stmt->execute([':cid' => $conv_id, ':uid' => $user_id]);
        }
        $all_docs = $doc_stmt->fetchAll();

        $scored = [];
        foreach ($all_docs as $doc) {
            $scored[] = [
                'doc'        => $doc,
                'plain_text' => strip_tags($doc['extracted_text']),
                'score'      => score_document_relevance(
                    $user_question,
                    strip_tags($doc['extracted_text']),
                    (bool)$doc['is_conv_doc']
                ),
            ];
        }
        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

        $used_chars = 0;
        $MAX_DOCS   = 5;

        foreach ($scored as $item) {
            if (count($doc_blocks) >= $MAX_DOCS) {
                break;
            }
            if ($item['score'] <= 0.0) {
                break;
            }

            $remaining = $total_budget - $used_chars;
            if ($remaining < 300) {
                break;
            }

            $doc   = $item['doc'];
            $full  = $item['plain_text'];
            $text  = mb_substr($full, 0, $remaining);
            $trunc = mb_strlen($full) > $remaining;
            $star  = $doc['is_conv_doc'] ? '★ ' : '';

            $block = "\n\n── {$star}{$doc['original_name']} ──\n{$text}";
            if ($trunc) {
                $block .= "\n[... truncated ...]";
            }

            $doc_blocks[] = $block;
            $used_chars  += mb_strlen($text);
        }
    }

    // System prompt
    $doc_count = count($doc_blocks);
    $system = <<<PROMPT
You are LegalTek AI, an expert legal assistant specialized in document analysis.
Your role is to help lawyers and legal professionals understand contracts, identify risks,
explain clauses, and answer legal questions with precision and professionalism.

LANGUAGE RULE (strictly enforced):
- Always respond in English only, regardless of the language the user writes in.

DOCUMENT UPLOAD RULE (strictly enforced):
- When the user message is exactly "(Document sent for analysis)", do NOT summarize,
  transcribe, or analyze the document. Simply reply with exactly:
  "I've reviewed your document. What questions do you have about it?"
  Nothing more.

ANSWERING RULES:
- Only analyze or quote documents when the user asks a specific question.
- Cite specific clauses or sections when relevant.
- When multiple documents are injected, clearly state which document you are quoting.
- When documents are listed from this conversation, ALL attached files are included (within size limits); cite them by filename.
- Documents marked with ★ in ranked mode are directly tied to this conversation.
- Highlight risks, ambiguities, or missing clauses only when asked.
- Use clear structured responses (numbered lists, bold for key terms).
- If the answer is not found in any document, say so clearly.
- Keep responses concise but thorough.
PROMPT;

    if ($doc_count > 0) {
        if ($from_conversation) {
            $system .= "\n\n═══ ALL DOCUMENTS IN THIS CONVERSATION ({$doc_count} file(s) — text included as context) ═══";
        } else {
            $system .= "\n\n═══ RELEVANT DOCUMENTS ({$doc_count} injected, ranked by relevance) ═══";
        }
        foreach ($doc_blocks as $block) {
            $system .= $block;
        }
    } else {
        $system .= "\n\nNo relevant documents available. Answer based on general legal knowledge.";
    }

    // Inject Court Listener research context when present
    if ($external_context) {
        $system .= "\n\n" . $external_context;
        $system .= "\n\nCOURT LISTENER INSTRUCTION (strictly enforced):\n"
                 . "- Respond in English only, regardless of the language the user writes in.\n"
                 . "- Base your answer primarily on the cases provided above.\n"
                 . "- Cite specific case names, courts, and filing dates inline as you reference them.\n"
                 . "- At the end of your response, always include a **Sources** section listing every case you used, formatted as:\n"
                 . "  1. Case Name — Court — Date — URL\n"
                 . "  Use the exact URL from each case header (the URL: field).\n"
                 . "- If the cases do not fully answer the question, supplement with general legal knowledge and clearly state you are doing so.";
    }

    // Message history
    $hist_stmt = $pdo->prepare("
        SELECT role, content FROM messages
        WHERE  conversation_id = ?
        ORDER  BY created_at DESC
        LIMIT  " . OLLAMA_HISTORY_LIMIT . "
    ");
    $hist_stmt->execute([$conv_id]);
    $history = array_reverse($hist_stmt->fetchAll());

    $messages = [['role' => 'system', 'content' => $system]];
    foreach ($history as $h) {
        $messages[] = ['role' => $h['role'], 'content' => $h['content']];
    }

    // Call Ollama
    @set_time_limit(OLLAMA_TIMEOUT + 60);
    @ini_set('max_execution_time', (string)(OLLAMA_TIMEOUT + 60));

    $payload = json_encode([
        'model'    => OLLAMA_MODEL,
        'messages' => $messages,
        'stream'   => false,
    ]);

    $ch = curl_init(OLLAMA_CHAT_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => OLLAMA_TIMEOUT,
    ]);

    $response  = curl_exec($ch);
    $curl_err  = curl_error($ch);
    $curl_errno = curl_errno($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        $msg = $curl_errno === 28
            ? 'Ollama timed out — try a smaller model or raise OLLAMA_TIMEOUT in config.php'
            : "Ollama unreachable: {$curl_err}";
        return ['content' => "⚠️ {$msg}", 'model' => OLLAMA_MODEL, 'tokens' => 0];
    }

    $data = json_decode($response, true);

    if ($http_code >= 400 || !is_array($data)) {
        return ['content' => "⚠️ Ollama error (HTTP {$http_code}): {$response}", 'model' => OLLAMA_MODEL, 'tokens' => 0];
    }

    return [
        'content' => $data['message']['content']          ?? '(empty response)',
        'model'   => $data['model']                        ?? OLLAMA_MODEL,
        'tokens'  => ($data['eval_count'] ?? 0) + ($data['prompt_eval_count'] ?? 0),
    ];
}


// ═══════════════════════════════════════════════════════════
//  COURT LISTENER — Research pipeline
// ═══════════════════════════════════════════════════════════

/** Generic GET → decoded JSON, returns null on failure */
function cl_get(string $url, int $timeout = 25): ?array
{
    $headers = [
        'Accept: application/json',
        'User-Agent: LegalTekAI/1.0 (legal research assistant)',
    ];
    $token = defined('CL_API_TOKEN') ? CL_API_TOKEN : '';
    if ($token) {
        $headers[] = "Authorization: Token {$token}";
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $body     = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$body || $http_code >= 400) return null;
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

/**
 * Router — decide if the message actually needs a CourtListener case search.
 * Returns true if it does, false for conversational/opinion/discussion messages.
 */
function cl_needs_search(string $user_query): bool
{
    $payload = json_encode([
        'model'  => OLLAMA_MODEL,
        'messages' => [
            [
                'role'    => 'system',
                'content' =>
                    'You are a router. Decide if the user message requires searching a US court case law database. '
                    . 'Answer only YES or NO. '
                    . 'Answer YES if the message asks about: laws, legal standards, court rulings, rights, crimes, contracts, liability, regulations, or any legal topic that benefits from case citations. '
                    . 'Answer NO if the message is: conversational ("what do you think?", "how are you?"), asks for an opinion on already-provided text without needing new cases, '
                    . 'or is a simple follow-up that does not require new case research. '
                    . 'Output only the word YES or NO.',
            ],
            ['role' => 'user', 'content' => $user_query],
        ],
        'stream' => false,
    ]);

    $ch = curl_init(OLLAMA_CHAT_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);

    $data   = json_decode($resp, true);
    $answer = strtoupper(trim($data['message']['content'] ?? 'NO'));
    return strpos($answer, 'YES') === 0;
}

/**
 * Agent 1 — Generate 5 diverse CourtListener search query sets from the user question.
 * Each set targets a different legal angle for broader case coverage.
 * Returns an array of up to 5 keyword strings.
 */
function cl_generate_queries(string $user_query): array
{
    $payload = json_encode([
        'model'   => OLLAMA_MODEL,
        'messages' => [
            [
                'role'    => 'system',
                'content' =>
                    'Generate exactly 5 different CourtListener keyword search sets for the legal question. '
                    . 'Each set must approach the question from a DIFFERENT angle: '
                    . '(1) core legal theory/doctrine, '
                    . '(2) specific statute or constitutional provision, '
                    . '(3) remedy or damages perspective, '
                    . '(4) procedural or jurisdiction angle, '
                    . '(5) alternative legal terminology. '
                    . 'Output EXACTLY 5 lines. Each line: 2-5 keywords separated by spaces. '
                    . 'No numbers, no bullets, no explanations, no blank lines. '
                    . 'Example for "landlord illegally locks out tenant":\n'
                    . 'eviction illegal lockout tenant rights\n'
                    . 'self-help eviction statutory prohibition\n'
                    . 'constructive eviction compensatory damages\n'
                    . 'unlawful detainer summary possession jurisdiction\n'
                    . 'quiet enjoyment covenant breach wrongful exclusion',
            ],
            ['role' => 'user', 'content' => $user_query],
        ],
        'stream' => false,
    ]);

    $ch = curl_init(OLLAMA_CHAT_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);

    $data    = json_decode($resp, true);
    $content = trim($data['message']['content'] ?? '');

    $queries = [];
    foreach (explode("\n", $content) as $line) {
        $line = trim($line);
        if ($line === '') continue;
        // Strip leading bullets/numbers the model might add
        $line = preg_replace('/^[\d\.\-\*\)\:]+\s*/', '', $line);
        $words = array_slice(array_filter(explode(' ', $line)), 0, 6);
        $q = implode(' ', $words);
        if ($q) $queries[] = $q;
        if (count($queries) >= 5) break;
    }

    // Fallback: use raw query if model returns nothing usable
    if (empty($queries)) $queries[] = $user_query;

    return $queries;
}

/**
 * Run multiple CourtListener searches in parallel using curl_multi.
 * Returns flat array of result objects, each tagged with _search_terms.
 */
function cl_multi_search(array $query_sets): array
{
    $token   = defined('CL_API_TOKEN') ? CL_API_TOKEN : '';
    $headers = ['Accept: application/json', 'User-Agent: LegalTekAI/1.0'];
    if ($token) $headers[] = "Authorization: Token {$token}";

    $mh    = curl_multi_init();
    $curls = [];

    foreach ($query_sets as $i => $terms) {
        $url = 'https://www.courtlistener.com/api/rest/v4/search/?' . http_build_query([
            'q'              => $terms,
            'type'           => 'o',
            'order_by'       => 'score desc',
            'stat_Published' => 'on',
            'page_size'      => 5,
        ]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $curls[$i] = ['ch' => $ch, 'terms' => $terms];
        curl_multi_add_handle($mh, $ch);
    }

    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh, 0.5);
    } while ($running > 0);

    $all_results = [];
    foreach ($curls as $entry) {
        $body = curl_multi_getcontent($entry['ch']);
        curl_multi_remove_handle($mh, $entry['ch']);
        curl_close($entry['ch']);
        $data = json_decode($body, true);
        if (is_array($data) && !empty($data['results'])) {
            foreach ($data['results'] as $r) {
                $r['_search_terms'] = $entry['terms'];
                $all_results[] = $r;
            }
        }
    }
    curl_multi_close($mh);

    return $all_results;
}

/**
 * Fetch the full plain text for one opinion by its CourtListener opinion ID.
 * Returns '' when unavailable.
 */
function cl_fetch_opinion_text(int $opinion_id): string
{
    $data = cl_get("https://www.courtlistener.com/api/rest/v4/opinions/{$opinion_id}/");
    if (!$data) return '';

    // Prefer plain_text; fallback to stripping HTML variants
    $text = $data['plain_text'] ?? '';
    if (!$text) {
        foreach (['html_with_citations', 'html_lawbox', 'html_columbia', 'html'] as $field) {
            if (!empty($data[$field])) {
                $text = strip_tags($data[$field]);
                break;
            }
        }
    }
    return trim($text);
}

/**
 * Full research pipeline:
 *  1. Transform query (GPT-4o)
 *  2. Search CourtListener (REST API)
 *  3. Fetch full text for each result (multiple GETs)
 *  4. Return ['context' => string, 'sources' => array]
 *     sources: [['name', 'url', 'court', 'date'], ...]
 */
function courtlistener_research(string $user_query): array
{
    // ── Step 0: router — skip search for conversational messages ──
    if (!cl_needs_search($user_query)) {
        return [
            'context'      => '',
            'sources'      => [],
            'terms'        => '',
            'result_count' => 0,
            'skipped'      => true,
        ];
    }

    // ── Step 1: generate 5 diverse query sets ─────────────
    $query_sets = cl_generate_queries($user_query);

    // ── Step 2: run all 5 searches in parallel ─────────────
    $all_hits = cl_multi_search($query_sets);

    if (empty($all_hits)) {
        return [
            'context'      => "No Court Listener cases found for: \"" . implode(' | ', $query_sets) . "\"",
            'sources'      => [],
            'terms'        => implode(' | ', $query_sets),
            'result_count' => 0,
        ];
    }

    // ── Step 3: deduplicate by cluster_id ─────────────────
    $seen   = [];
    $unique = [];
    foreach ($all_hits as $r) {
        $key = $r['cluster_id'] ?? $r['id'] ?? null;
        if ($key !== null) {
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
        }
        $unique[] = $r;
        if (count($unique) >= 10) break; // cap at 10 unique cases
    }

    // ── Step 4: fetch full text for each unique case ───────
    $blocks  = [];
    $sources = [];

    foreach ($unique as $i => $r) {
        $case_name  = $r['caseName']     ?? $r['case_name']  ?? "Case #" . ($i + 1);
        $court      = $r['court']        ?? $r['court_id']   ?? '';
        $date       = $r['dateFiled']    ?? $r['date_filed'] ?? '';
        $abs_url    = $r['absolute_url'] ?? '';
        // In v4 type=o search, 'id' is the CLUSTER id
        $cluster_id = $r['cluster_id']   ?? $r['id']         ?? null;

        // In v4, snippet lives inside each opinion object
        $snippet = '';
        if (!empty($r['opinions']) && is_array($r['opinions'])) {
            foreach ($r['opinions'] as $op) {
                if (is_array($op) && !empty($op['snippet'])) {
                    $snippet = $op['snippet'];
                    break;
                }
            }
        }
        if (!$snippet) $snippet = $r['snippet'] ?? $r['text'] ?? $r['description'] ?? '';

        // Build canonical CourtListener URL
        $case_url = '';
        if ($abs_url) {
            $case_url = (strpos($abs_url, 'http') === 0)
                ? $abs_url
                : 'https://www.courtlistener.com' . $abs_url;
        }

        $text = '';

        // Path A: opinions array inside search result
        if (!$text && !empty($r['opinions']) && is_array($r['opinions'])) {
            foreach ($r['opinions'] as $op) {
                $op_id = is_array($op) ? ($op['id'] ?? null) : null;
                if (!$op_id && is_string($op) && preg_match('#/(\d+)/#', $op, $m)) {
                    $op_id = (int)$m[1];
                }
                if ($op_id) {
                    $text = cl_fetch_opinion_text((int)$op_id);
                    if ($text) break;
                }
            }
        }

        // Path B: cluster_id → opinions list (primary reliable path for type=o)
        if (!$text && $cluster_id) {
            $ops = cl_get("https://www.courtlistener.com/api/rest/v4/opinions/?cluster={$cluster_id}&page_size=3", 20);
            if ($ops && !empty($ops['results'])) {
                foreach ($ops['results'] as $op) {
                    if (!empty($op['id'])) {
                        $text = cl_fetch_opinion_text((int)$op['id']);
                        if ($text) break;
                    }
                }
            }
        }

        // Path C: try parsing opinion ID from absolute_url  /opinion/{id}/slug/
        if (!$text && $abs_url && preg_match('#/opinion/(\d+)/#', $abs_url, $m)) {
            $text = cl_fetch_opinion_text((int)$m[1]);
        }

        // Path D: snippet / description fallback
        if (!$text) $text = $snippet;
        if (!$text) continue;

        // Trim to max 12 000 chars per case
        $trimmed   = mb_substr(trim($text), 0, 12000);
        $truncated = mb_strlen($text) > 12000;

        $header = "── CASE: {$case_name}";
        if ($court)    $header .= " | {$court}";
        if ($date)     $header .= " | Filed: {$date}";
        if ($case_url) $header .= " | URL: {$case_url}";
        $header .= " ──";

        $block = $header . "\n" . $trimmed;
        if ($truncated) $block .= "\n[... truncated ...]";

        $blocks[] = $block;

        $sources[] = [
            'name'  => $case_name,
            'url'   => $case_url,
            'court' => $court,
            'date'  => $date,
        ];
    }

    $raw_count = count($all_hits);
    $terms_str = implode(' | ', $query_sets);

    if (empty($blocks)) {
        return [
            'context'      => "Court Listener returned {$raw_count} results but no readable text for: \"{$terms_str}\"",
            'sources'      => [],
            'terms'        => $terms_str,
            'result_count' => $raw_count,
        ];
    }

    $context = "═══ COURT LISTENER RESEARCH — 5 searches merged ({$raw_count} hits, " . count($unique) . " unique) ═══\n"
             . "Queries: {$terms_str}\n\n"
             . implode("\n\n", $blocks);

    return [
        'context'      => $context,
        'sources'      => $sources,
        'terms'        => $terms_str,
        'result_count' => $raw_count,
    ];
}


// ═══════════════════════════════════════════════════════════
//  DOCUMENT RAG — Semantic search within conversation files
// ═══════════════════════════════════════════════════════════

/**
 * Generate 3 diverse keyword sets optimised for searching
 * inside legal documents (different from CourtListener queries).
 */
function doc_generate_queries(string $user_query): array
{
    $payload = json_encode([
        'model'   => OLLAMA_MODEL,
        'messages' => [
            [
                'role'    => 'system',
                'content' =>
                    'Generate exactly 3 different keyword sets to search relevant passages inside legal documents. '
                    . 'Each set must target a DIFFERENT angle: '
                    . '(1) core legal concepts / obligations mentioned, '
                    . '(2) specific parties, dates, amounts, or clause names, '
                    . '(3) legal consequences, remedies, or breach terms. '
                    . 'Output EXACTLY 3 lines. Each line: 2-5 keywords separated by spaces. '
                    . 'No numbers, no bullets, no explanations. '
                    . 'Example for "what are the penalties if I break the contract early":\n'
                    . 'early termination penalty clause\n'
                    . 'liquidated damages breach notice\n'
                    . 'termination fee cure period remedy',
            ],
            ['role' => 'user', 'content' => $user_query],
        ],
        'stream' => false,
    ]);

    $ch = curl_init(OLLAMA_CHAT_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 45,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);

    $data    = json_decode($resp, true);
    $content = trim($data['message']['content'] ?? '');

    $queries = [];
    foreach (explode("\n", $content) as $line) {
        $line = trim(preg_replace('/^[\d\.\-\*\)\:]+\s*/', '', $line));
        $words = array_slice(array_filter(explode(' ', $line)), 0, 6);
        $q = implode(' ', $words);
        if ($q) $queries[] = $q;
        if (count($queries) >= 3) break;
    }

    if (empty($queries)) $queries[] = $user_query;
    return $queries;
}

/**
 * Extract a passage around a keyword match (KWIC).
 */
function kwic_extract(string $text, string $keyword, int $window = 400): string
{
    $pos = mb_stripos($text, $keyword);
    if ($pos === false) return '';
    $start   = max(0, $pos - (int)($window / 2));
    $excerpt = mb_substr($text, $start, $window + mb_strlen($keyword));
    if ($start > 0) $excerpt = '…' . ltrim($excerpt);
    if ($start + $window + mb_strlen($keyword) < mb_strlen($text)) $excerpt = rtrim($excerpt) . '…';
    return trim($excerpt);
}

/**
 * Search conversation document chunks for relevant passages.
 * Tries FULLTEXT first; falls back to LIKE on extracted_text.
 * Returns ['context' => string, 'sources' => array].
 */
function search_conversation_docs(PDO $pdo, int $conv_id, string $user_query): array
{
    // ── Get document IDs for this conversation ──────────
    $stmt = $pdo->prepare("
        SELECT DISTINCT d.id, d.original_name
        FROM documents d
        LEFT JOIN messages m ON m.document_id = d.id AND m.conversation_id = :c2
        WHERE (d.conversation_id = :c1 OR m.id IS NOT NULL)
          AND d.status = 'ready'
          AND d.extracted_text IS NOT NULL
          AND d.extracted_text != ''
    ");
    $stmt->execute([':c1' => $conv_id, ':c2' => $conv_id]);
    $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($docs)) return ['context' => '', 'sources' => []];

    $doc_ids   = array_column($docs, 'id');
    $doc_names = array_column($docs, 'original_name', 'id');
    $holders   = implode(',', array_fill(0, count($doc_ids), '?'));

    // ── Generate 3 diverse query sets ───────────────────
    $query_sets = doc_generate_queries($user_query);

    // ── Check if chunks exist ────────────────────────────
    $cnt_stmt = $pdo->prepare("SELECT COUNT(*) FROM document_chunks WHERE document_id IN ({$holders})");
    $cnt_stmt->execute($doc_ids);
    $has_chunks = (int)$cnt_stmt->fetchColumn() > 0;

    $seen    = [];
    $blocks  = [];
    $sources = [];

    if ($has_chunks) {
        // ── FULLTEXT search in document_chunks ───────────
        foreach ($query_sets as $terms) {
            // Build boolean mode query: prefix each word with +
            $bool_terms = implode(' ', array_map(
                fn($w) => '+' . preg_replace('/[^\w]/', '', $w),
                array_filter(explode(' ', $terms))
            ));
            if (!$bool_terms) continue;

            try {
                $sql = "
                    SELECT dc.id, dc.document_id, dc.content,
                           MATCH(dc.content) AGAINST (? IN BOOLEAN MODE) AS score
                    FROM document_chunks dc
                    WHERE dc.document_id IN ({$holders})
                      AND MATCH(dc.content) AGAINST (? IN BOOLEAN MODE)
                    ORDER BY score DESC
                    LIMIT 3
                ";
                $params = array_merge([$bool_terms], $doc_ids, [$bool_terms]);
                $s = $pdo->prepare($sql);
                $s->execute($params);
                foreach ($s->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    if (isset($seen['c' . $row['id']])) continue;
                    $seen['c' . $row['id']] = true;
                    $doc_name = $doc_names[$row['document_id']] ?? 'Document';
                    $blocks[] = "── DOC: {$doc_name} ── (search: \"{$terms}\")\n" . trim($row['content']);
                    if (!isset($sources[$row['document_id']])) {
                        $sources[$row['document_id']] = ['name' => $doc_name, 'url' => '', 'court' => '', 'date' => ''];
                    }
                }
            } catch (PDOException $e) {
                // FULLTEXT index missing — drop to LIKE fallback below
                $has_chunks = false;
                break;
            }
        }
    }

    if (!$has_chunks || empty($blocks)) {
        // ── LIKE fallback: search in extracted_text ───────
        $sql = "SELECT id, original_name, extracted_text FROM documents WHERE id IN ({$holders})";
        $s   = $pdo->prepare($sql);
        $s->execute($doc_ids);
        $all_docs = $s->fetchAll(PDO::FETCH_ASSOC);

        foreach ($query_sets as $terms) {
            $keywords = array_filter(explode(' ', $terms));
            foreach ($all_docs as $doc) {
                $plain = strip_tags((string)$doc['extracted_text']);
                foreach ($keywords as $kw) {
                    $passage = kwic_extract($plain, $kw, 500);
                    if (!$passage) continue;
                    $key = $doc['id'] . ':' . mb_substr($passage, 5, 30);
                    if (isset($seen[$key])) continue;
                    $seen[$key] = true;
                    $blocks[] = "── DOC: {$doc['original_name']} ── (search: \"{$terms}\")\n{$passage}";
                    if (!isset($sources[$doc['id']])) {
                        $sources[$doc['id']] = ['name' => $doc['original_name'], 'url' => '', 'court' => '', 'date' => ''];
                    }
                    break; // one passage per keyword per doc per query
                }
                if (count($blocks) >= 6) break 2;
            }
        }
    }

    if (empty($blocks)) return ['context' => '', 'sources' => []];

    $context = "═══ CONVERSATION DOCUMENTS — " . count($docs) . " doc(s), "
             . count($blocks) . " relevant passages ═══\n"
             . "Searched: \"" . implode('" | "', $query_sets) . "\"\n\n"
             . implode("\n\n", $blocks);

    return [
        'context' => $context,
        'sources' => array_values($sources),
    ];
}

// ═══════════════════════════════════════════════════════════
//  HELPER — Extract plain text from .docx
// ═══════════════════════════════════════════════════════════
/**
 * Split plain text into overlapping chunks for RAG storage.
 * Tries to break on paragraph or sentence boundaries.
 */
function split_into_chunks(string $text, int $size = 800, int $overlap = 150): array
{
    $text = preg_replace('/[ \t]+/', ' ', trim($text));
    $len  = mb_strlen($text);
    if ($len === 0) return [];

    $chunks = [];
    $start  = 0;

    while ($start < $len) {
        $raw = mb_substr($text, $start, $size);
        if (mb_strlen($raw) < 60) break;

        // Try to end at a paragraph or sentence boundary
        $end_at = $start + $size;
        if ($end_at < $len) {
            // Look for newline within last 200 chars of the window
            $search_back = mb_substr($text, $start + $size - 200, 200);
            $nl = mb_strrpos($search_back, "\n");
            $dot = mb_strrpos($search_back, '. ');
            $boundary = max($nl !== false ? $nl : -1, $dot !== false ? $dot + 1 : -1);
            if ($boundary >= 0) {
                $raw = mb_substr($text, $start, ($size - 200) + $boundary + 1);
            }
        }

        $chunks[] = trim($raw);
        $advance  = mb_strlen($raw) - $overlap;
        $start   += max($advance, 100); // never loop backwards
    }

    return $chunks;
}

/**
 * Populate document_chunks for a newly uploaded document.
 */
function populate_document_chunks(PDO $pdo, int $doc_id, string $extracted_text): void
{
    $plain  = strip_tags($extracted_text);
    $chunks = split_into_chunks($plain);
    if (empty($chunks)) return;

    $stmt = $pdo->prepare(
        "INSERT INTO document_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)"
    );
    foreach ($chunks as $idx => $chunk) {
        $stmt->execute([$doc_id, $idx, $chunk]);
    }
}

function extract_docx_text(string $file_path): string
{
    if (!class_exists('ZipArchive')) {
        return '[ZipArchive not available — enable php_zip in php.ini]';
    }

    $zip = new ZipArchive();

    if ($zip->open($file_path) !== true) {
        return '[Could not open .docx file]';
    }

    $xml = $zip->getFromName('word/document.xml');
    $zip->close();

    if ($xml === false) {
        return '[word/document.xml not found inside .docx]';
    }

    $xml  = str_replace(['</w:p>', '</w:tr>'], "\n", $xml);
    $xml  = str_replace('<w:tab/>', "\t", $xml);
    $text = strip_tags($xml);
    $text = preg_replace('/[ \t]+/', ' ', $text);
    $text = preg_replace('/\n{3,}/', "\n\n", $text);

    return trim($text);
}
