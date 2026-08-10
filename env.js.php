<?php
/**
 * LegalTek AI — env.js.php
 * Bridges .env into the browser for the React frontend.
 *
 * Loaded from index.html as a plain <script> before utils.jsx, so
 * window.LT_ENV is available to every component.
 *
 * ⚠️  ONLY public values belong here. DB_HOST / DB_NAME / DB_USER / DB_PASS
 *     must never be echoed — anything in this file is world-readable.
 */

require_once __DIR__ . '/env.php';

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store');

$public = [
    'API_URL' => env('API_URL', 'http://localhost/LegalTek/api.php'),
];

echo 'window.LT_ENV = ' . json_encode($public, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . ";\n";
