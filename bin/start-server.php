<?php

declare(strict_types=1);

$defaults = [
    'host' => '127.0.0.1',
    'port' => '8000',
    'root' => 'docs',
];

$options = $defaults;

foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--port=')) {
        $options['port'] = substr($arg, 7);
        continue;
    }

    if (str_starts_with($arg, '--root=')) {
        $options['root'] = substr($arg, 7);
        continue;
    }

    if (str_starts_with($arg, '--host=')) {
        $options['host'] = substr($arg, 7);
        continue;
    }

    fwrite(STDERR, "Unknown option: {$arg}\n");
    fwrite(STDERR, "Usage: php bin/start-server.php [--host=HOST] [--port=PORT] [--root=ROOT]\n");
    exit(1);
}

$rootPath = $options['root'];
if (!is_dir($rootPath)) {
    fwrite(STDERR, "Root directory not found: {$rootPath}\n");
    exit(1);
}

$port = $options['port'];
if (!preg_match('/^\d+$/', $port) || (int) $port < 1 || (int) $port > 65535) {
    fwrite(STDERR, "Invalid port: {$port}\n");
    exit(1);
}

$host = $options['host'];
$url = "http://{$host}:{$port}";

fwrite(STDOUT, "Starting PHP server at {$url} (root: {$rootPath})\n");

$cmd = sprintf(
    '%s -S %s -t %s',
    escapeshellarg(PHP_BINARY),
    escapeshellarg("{$host}:{$port}"),
    escapeshellarg($rootPath)
);

passthru($cmd, $exitCode);
exit($exitCode);
