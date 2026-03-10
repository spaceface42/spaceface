<?php
declare(strict_types=1);

$phpExe = 'C:/applications/php/php.exe';
$docRoot = dirname(__DIR__) . '/docs';
$host = $argv[1] ?? '127.0.0.1';
$port = $argv[2] ?? '8000';

if (!is_file($phpExe)) {
    fwrite(STDERR, "PHP executable not found: {$phpExe}\n");
    exit(1);
}

if (!is_dir($docRoot)) {
    fwrite(STDERR, "Document root not found: {$docRoot}\n");
    exit(1);
}

$address = "{$host}:{$port}";
$cmd = sprintf('"%s" -S %s -t "%s"', $phpExe, $address, $docRoot);

echo "Starting PHP built-in server at http://{$address}\n";
echo "Document root: {$docRoot}\n\n";

passthru($cmd, $exitCode);
exit($exitCode);
