<?php
/**
 * LegalTek AI — env.php
 * Minimal .env loader (no Composer / no dependencies).
 *
 * Usage:
 *   require_once __DIR__ . '/env.php';
 *   $host = env('DB_HOST', 'localhost');
 *
 * Supports:  KEY=value  ·  # comments  ·  "quoted"  ·  'quoted'  ·  blank lines
 */

/** Parse .env once into a static array. */
function env_all(): array
{
    static $vars = null;
    if ($vars !== null) {
        return $vars;
    }

    $vars = [];
    $file = __DIR__ . '/.env';
    if (!is_readable($file)) {
        return $vars;
    }

    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);

        // Skip comments and anything that isn't KEY=VALUE
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }

        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);

        // Strip matching surrounding quotes
        if (strlen($val) >= 2) {
            $first = $val[0];
            $last  = $val[strlen($val) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $val = substr($val, 1, -1);
            }
        }

        if ($key !== '') {
            $vars[$key] = $val;
        }
    }

    return $vars;
}

/**
 * Read one variable. Real environment variables (Apache SetEnv, Docker, CI)
 * win over .env so deployments can override without editing files.
 */
function env(string $key, $default = null)
{
    $sys = getenv($key);
    if ($sys !== false && $sys !== '') {
        return $sys;
    }

    $vars = env_all();
    return array_key_exists($key, $vars) ? $vars[$key] : $default;
}
