<?php

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Enforces the dependency rules of docs/architecture/ddd.md by reading every imported or
 * fully-qualified class name under src/ and app/. Plain PHPUnit (no Laravel boot) so it runs in
 * milliseconds and can never be skipped by a broken container.
 */
class LayerDependencyTest extends TestCase
{
    /**
     * Legacy files that still reach into a migrated context's Infrastructure. Each entry is
     * temporary and is removed when the legacy side is migrated — this list only shrinks.
     *
     * @var array<string, list<string>> relative path => forbidden class names it may still use
     */
    private const LEGACY_ALLOWLIST = [];

    private const ROOT = __DIR__.'/../..';

    public function test_domain_layers_depend_only_on_their_own_domain_and_the_shared_kernel(): void
    {
        $violations = [];

        foreach ($this->srcFiles() as [$path, $context, $layer]) {
            if ($layer !== 'Domain') {
                continue;
            }

            foreach ($this->referencedClasses($path) as $class) {
                if (! $this->isNamespaced($class)
                    || $this->startsWith($class, 'Elikia\\Shared\\Domain\\')
                    || $this->startsWith($class, "Elikia\\{$context}\\Domain\\")) {
                    continue;
                }

                $violations[] = "{$this->relative($path)} uses {$class}";
            }
        }

        $this->assertSame([], $violations, "Domain code must stay framework-free and context-local:\n".implode("\n", $violations));
    }

    public function test_application_layers_never_touch_infrastructure_or_the_framework(): void
    {
        $violations = [];

        foreach ($this->srcFiles() as [$path, $context, $layer]) {
            if ($layer !== 'Application') {
                continue;
            }

            foreach ($this->referencedClasses($path) as $class) {
                if (! $this->isNamespaced($class)
                    || $this->startsWith($class, 'Elikia\\Shared\\Domain\\')
                    || $this->startsWith($class, 'Elikia\\Shared\\Application\\')
                    || $this->startsWith($class, "Elikia\\{$context}\\Domain\\")
                    || preg_match('/^Elikia\\\\\w+\\\\Application\\\\/', $class)) {
                    continue;
                }

                $violations[] = "{$this->relative($path)} uses {$class}";
            }
        }

        $this->assertSame([], $violations, "Application code may only use Domain/Application classes:\n".implode("\n", $violations));
    }

    public function test_contexts_only_talk_to_each_other_through_their_application_layer(): void
    {
        $violations = [];

        foreach ($this->srcFiles() as [$path, $context]) {
            foreach ($this->referencedClasses($path) as $class) {
                if (! preg_match('/^Elikia\\\\(\w+)\\\\(\w+)\\\\/', $class, $m)) {
                    continue;
                }

                [, $otherContext, $otherLayer] = $m;

                if ($otherContext !== $context && $otherContext !== 'Shared' && $otherLayer !== 'Application') {
                    $violations[] = "{$this->relative($path)} uses {$class}";
                }
            }
        }

        $this->assertSame([], $violations, "Cross-context access must go through the other context's Application layer:\n".implode("\n", $violations));
    }

    public function test_the_delivery_layer_never_reaches_into_infrastructure(): void
    {
        $violations = [];

        foreach ($this->phpFiles(self::ROOT.'/app') as $path) {
            $relative = $this->relative($path);

            foreach ($this->referencedClasses($path) as $class) {
                if (preg_match('/^Elikia\\\\\w+\\\\Infrastructure\\\\/', $class)
                    && ! in_array($class, self::LEGACY_ALLOWLIST[$relative] ?? [], true)) {
                    $violations[] = "{$relative} uses {$class}";
                }
            }
        }

        $this->assertSame([], $violations, "app/ must dispatch commands/queries instead of using Infrastructure:\n".implode("\n", $violations));
    }

    public function test_the_scanner_sees_the_source_tree_and_every_import_form(): void
    {
        $this->assertNotEmpty(iterator_to_array($this->srcFiles(), false));

        $found = $this->referencedClasses(__DIR__.'/fixtures/ImportForms.php.txt');
        sort($found);

        $this->assertSame([
            'App\\Models\\Company',
            'Elikia\\Catalog\\Domain\\Product\\Product',
            'Elikia\\Shared\\Domain\\CompanyId',
            'Elikia\\Shared\\Domain\\Money',
            'Illuminate\\Support\\Facades\\DB',
        ], $found);
    }

    /** @return iterable<array{0: string, 1: string, 2: string}> path, context, layer */
    private function srcFiles(): iterable
    {
        foreach ($this->phpFiles(self::ROOT.'/src') as $path) {
            $parts = explode('/', str_replace('\\', '/', substr($path, strlen(realpath(self::ROOT.'/src')) + 1)));

            yield [$path, $parts[0], $parts[1] ?? ''];
        }
    }

    /** @return iterable<string> */
    private function phpFiles(string $directory): iterable
    {
        $directory = realpath($directory);

        if ($directory === false) {
            return;
        }

        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS)) as $file) {
            if ($file->getExtension() === 'php') {
                yield $file->getPathname();
            }
        }
    }

    /**
     * Top-level `use` imports (including grouped `use A\{B, C};`) plus fully-qualified names
     * written inline, plus same-namespace references are irrelevant (always allowed).
     *
     * @return list<string>
     */
    private function referencedClasses(string $path): array
    {
        $source = file_get_contents($path);
        $classes = [];

        // Column-0 `use` lines are imports; indented ones are trait uses inside a class body.
        preg_match_all('/^use\s+(?:function\s+|const\s+)?([^;]+);/m', $source, $imports);

        foreach ($imports[1] as $import) {
            if (preg_match('/^(.+?)\\\\\{(.+)\}$/s', trim($import), $group)) {
                foreach (explode(',', $group[2]) as $member) {
                    $classes[] = $group[1].'\\'.trim(preg_split('/\s+as\s+/i', trim($member))[0]);
                }

                continue;
            }

            $classes[] = trim(preg_split('/\s+as\s+/i', trim($import))[0]);
        }

        preg_match_all('/(?<![\w\\\\])\\\\([A-Z]\w*(?:\\\\\w+)+)/', $source, $inline);

        return array_values(array_unique([...$classes, ...$inline[1]]));
    }

    private function isNamespaced(string $class): bool
    {
        return str_contains($class, '\\');
    }

    private function startsWith(string $class, string $prefix): bool
    {
        return str_starts_with($class, $prefix);
    }

    private function relative(string $path): string
    {
        return str_replace('\\', '/', substr($path, strlen(realpath(self::ROOT)) + 1));
    }
}
