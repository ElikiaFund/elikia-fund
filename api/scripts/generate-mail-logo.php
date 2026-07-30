<?php

/**
 * Generates public/images/mail-logo.png, referenced by the branded e-mail header
 * (resources/views/vendor/mail/html/message.blade.php via asset()) from the real app icon
 * (mobile/assets/images/icon.png) — a 1024x1024 black square with the "ElikiaFund" wordmark
 * centered in a fairly thin horizontal band. Used directly at full size, the wordmark would be
 * too small to read at normal e-mail logo heights, so this crops tightly to the wordmark's
 * bounding box (detected by scanning for non-black pixels, not hardcoded coordinates — safe to
 * re-run if the source icon is ever redrawn) before downscaling.
 *
 * Publicly served (not embedded as a cid: attachment) because Illuminate\Mail\Markdown's
 * component-based theme (<x-mail::header> etc.) does not forward the $message variable into
 * nested component views in this Laravel version — $message->embed() throws "Call to a member
 * function embed() on null" from inside resources/views/vendor/mail/html/*.blade.php, even
 * though it works in mailables that render top-level (non-markdown) Blade views. Confirmed via
 * Mail::send() with a real SupportTicketReceived instance, not just an assumption.
 *
 * Usage: php scripts/generate-mail-logo.php
 */
$sourcePath = __DIR__.'/../../mobile/assets/images/icon.png';
$outputPath = __DIR__.'/../public/images/mail-logo.png';

$source = imagecreatefrompng($sourcePath);
$width = imagesx($source);
$height = imagesy($source);

$minX = $width;
$minY = $height;
$maxX = 0;
$maxY = 0;
$threshold = 40; // grayscale brightness above which a pixel counts as "wordmark", not background

for ($y = 0; $y < $height; $y++) {
    for ($x = 0; $x < $width; $x++) {
        $rgb = imagecolorat($source, $x, $y);
        $r = ($rgb >> 16) & 0xFF;
        $g = ($rgb >> 8) & 0xFF;
        $b = $rgb & 0xFF;
        $brightness = ($r + $g + $b) / 3;

        if ($brightness > $threshold) {
            $minX = min($minX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x);
            $maxY = max($maxY, $y);
        }
    }
}

$padding = 24;
$cropX = max(0, $minX - $padding);
$cropY = max(0, $minY - $padding);
$cropWidth = min($width, $maxX + $padding) - $cropX;
$cropHeight = min($height, $maxY + $padding) - $cropY;

$targetHeight = 96;
$targetWidth = (int) round($cropWidth * ($targetHeight / $cropHeight));

$output = imagecreatetruecolor($targetWidth, $targetHeight);
$black = imagecolorallocate($output, 0, 0, 0);
imagefill($output, 0, 0, $black);

imagecopyresampled($output, $source, 0, 0, $cropX, $cropY, $targetWidth, $targetHeight, $cropWidth, $cropHeight);

if (! is_dir(dirname($outputPath))) {
    mkdir(dirname($outputPath), recursive: true);
}

imagepng($output, $outputPath);

echo "Wrote {$outputPath} ({$targetWidth}x{$targetHeight}, cropped from {$cropWidth}x{$cropHeight} at {$cropX},{$cropY})\n";
