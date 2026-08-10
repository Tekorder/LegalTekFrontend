<?php
/**
 * LegalTek AI — config.php
 * ⚠️  Never commit this file to git or deploy to production with a real key.
 *     Add config.php to your .gitignore.
 */

// ── Ollama (local) ───────────────────────────────────────
define('OLLAMA_CHAT_URL',    'http://localhost:11434/api/chat');
define('OLLAMA_TAGS_URL',    'http://localhost:11434/api/tags');
define('OLLAMA_MODEL',       'llama3.2:latest');
define('OLLAMA_TIMEOUT',     300);

// ── CourtListener (https://www.courtlistener.com/sign-in/) ──
// Get your token at: Profile → API Token
define('CL_API_TOKEN', '7f245e25661f82c83a1f6aad94dfca4680400a7d');

// Max characters of document text sent to the model
define('OLLAMA_DOC_MAX_CHARS', 80000);

// Max prior messages included in each API call
define('OLLAMA_HISTORY_LIMIT', 12);
