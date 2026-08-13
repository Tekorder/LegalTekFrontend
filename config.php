<?php
/**
 * LegalTek AI — config.php
 * ⚠️  Never commit this file to git or deploy to production with a real key.
 *     Add config.php to your .gitignore.
 *
 * Database + API URL live in .env (see .env.example) — not here.
 */

require_once __DIR__ . '/env.php';

// ── Database (from .env) ─────────────────────────────────
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', 'legaltek'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));

// ── Public API base URL, shared with the React frontend ──
define('API_URL', env('API_URL', 'http://localhost/LegalTek/api.php'));

// ── Timezone (from .env) ─────────────────────────────────
// One zone for every timestamp the app writes — UTC, so stored instants are
// zone-neutral and the UI converts per viewer. Without this PHP falls back
// to php.ini's date.timezone (Europe/Berlin on XAMPP) while MySQL keeps
// using the OS zone, so date() and CURRENT_TIMESTAMP disagreed by hours.
$lt_tz = env('APP_TIMEZONE', 'UTC');
define('APP_TIMEZONE', in_array($lt_tz, timezone_identifiers_list(), true) ? $lt_tz : 'UTC');
date_default_timezone_set(APP_TIMEZONE);
unset($lt_tz);

// ── Ollama (local, from .env) ────────────────────────────
// 127.0.0.1 not localhost — see the note in .env.example.
define('OLLAMA_HOST',        rtrim(env('OLLAMA_HOST', 'http://127.0.0.1:11434'), '/'));
define('OLLAMA_CHAT_URL',    OLLAMA_HOST . '/api/chat');
define('OLLAMA_TAGS_URL',    OLLAMA_HOST . '/api/tags');
define('OLLAMA_MODEL',       env('OLLAMA_MODEL', 'llama3.2:latest'));
define('OLLAMA_TIMEOUT',     (int) env('OLLAMA_TIMEOUT', 300));
// How often a running generation checks that its answer is still wanted.
// Lower = fewer wasted tokens after a delete, one cheap SELECT per poll.
define('OLLAMA_CANCEL_POLL', max(0.1, (float) env('OLLAMA_CANCEL_POLL', 1.0)));

// ── CourtListener (https://www.courtlistener.com/sign-in/) ──
// Get your token at: Profile → API Token
define('CL_API_TOKEN', '7f245e25661f82c83a1f6aad94dfca4680400a7d');

// Max characters of document text sent to the model
define('OLLAMA_DOC_MAX_CHARS', 80000);

// Max prior messages included in each API call
define('OLLAMA_HISTORY_LIMIT', 12);
