<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Lokasi Backend Laravel (DI LUAR public_html)
|--------------------------------------------------------------------------
| Backend ditempatkan sejajar dengan public_html di dalam folder domain:
|
|   ~/domains/kebunku.bpompalopo.com/
|   ├── public_html/        <- file ini di sini (document root)
|   └── kebunku_backend/    <- Laravel app di sini
|
| Maka path relatifnya: __DIR__ . '/../kebunku_backend'
|
| Jika berbeda, ubah baris di bawah, atau pakai path absolut:
|   $backend = '/home/u192774805/domains/kebunku.bpompalopo.com/kebunku_backend';
*/
$backend = __DIR__ . '/../kebunku_backend';

// Maintenance mode...
if (file_exists($maintenance = $backend . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Composer autoloader...
require $backend . '/vendor/autoload.php';

// Bootstrap Laravel dan tangani request...
/** @var Application $app */
$app = require_once $backend . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
