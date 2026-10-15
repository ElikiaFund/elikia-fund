<?php

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Enforces the dependency rules of docs/architecture/ddd.md by reading every imported or
 * fully-qualified class name under app/. Plain PHPUnit (no Laravel boot) so it runs in
 * milliseconds and can never be skipped by a broken container.
 */
class LayerDependencyTest extends TestCase
{
    /**
     * Legacy files that still reach into a migrated context's Infrastructure. Each entry is
     * temporary and is removed when the legacy side is migrated — this list only shrinks.
     *
     * @var array<string, list<string>> path relative to api/ => Infrastructure classes it may still use
     */
    private const LEGACY_ALLOWLIST = [
        // Eloquent relations used by eager loads (admin company page, financial dossier) — go
        // away when Business and Bookkeeping are migrated.
        'app/Models/Company.php' => [
            'App\\Domains\\Catalog\\Infrastructure\\Persistence\\Eloquent\\ProductCategoryRecord',
            'App\\Domains\\Catalog\\Infrastructure\\Persistence\\Eloquent\\ProductRecord',
        ],
        'app/Models/Transaction.php' => [
            'App\\Domains\\Catalog\\Infrastructure\\Persistence\\Eloquent\\ProductRecord',
        ],
    ];

    private const DOMAINS = 'App\\Domains\\';

    private const ROOT = __DIR__.'/../..';

    public function test_domain_layers_depend_only_on_their_own_domain_and_the_shared_kernel(): void
    {
        $violations = [];

        foreach ($this->contextFiles() as [$path, $context, $layer]) {
            if ($layer !== 'Domain') {
                continue;
            }

            foreach ($this->referencedClasses($path) as $class) {
                if ($this->isGlobal($class) || $this->isLayer($class, 'Shared', 'Domain') || $this->isLayer($class, $context, 'Domain')) {
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

        foreach ($this->contextFiles() as [$path, $context, $layer]) {
            if ($layer !== 'Application') {
                continue;
            }

            foreach ($this->referencedClasses($path) as $class) {
                [$otherContext, $otherLayer] = $this->locate($class);

                $allowed = $this->isGlobal($class)
                    || $this->isLayer($class, 'Shared', 'Domain')
                    || $this->isLayer($class, $context, 'Domain')
                    || $otherLayer === 'Application';

                if (! $allowed) {
                    $violations[] = "{$this->relative($path)} uses {$class}";
                }
            }
        }

        $this->assertSame([], $violations, "Application code may only use Domain/Application classes:\n".implode("\n", $violations));
    }

    public function test_contexts_only_talk_to_each_other_through_their_application_layer(): void
    {
        $violations = [];

        foreach ($this->contextFiles() as [$path, $context]) {
            foreach ($this->referencedClasses($path) as $class) {
                [$otherContext, $otherLayer] = $this->locate($class);

                if ($otherContext !== null && $otherContext !== $context && $otherContext !== 'Shared' && $otherLayer !== 'Application') {
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

            if (str_starts_with($relative, 'app/Domains/')) {
                continue;
            }

            foreach ($this->referencedClasses($path) as $class) {
                if ($this->locate($class)[1] === 'Infrastructure' && ! in_array($class, self::LEGACY_ALLOWLIST[$relative] ?? [], true)) {
                    $violations[] = "{$relative} uses {$class}";
                }
            }
        }

        $this->assertSame([], $violations, "Controllers, commands and legacy code must go through the buses, not Infrastructure:\n".implode("\n", $violations));
    }

    public function test_the_scanner_sees_the_contexts_and_every_import_form(): void
    {
        $this->assertNotEmpty(iterator_to_array($this->contextFiles(), false));

        $found = $this->referencedClasses(__DIR__.'/fixtures/ImportForms.php.txt');
        sort($found);

        $this->assertSame([
            'App\\Domains\\Catalog\\Domain\\Product\\Product',
            'App\\Domains\\Shared\\Domain\\CompanyId',
            'App\\Domains\\Shared\\Domain\\Money',
            'App\\Models\\Company',
            'Illuminate\\Support\\Facades\\DB',
        ], $found);
        $this->assertSame(['Catalog', 'Domain'], $this->locate('App\\Domains\\Catalog\\Domain\\Product\\Product'));
        $this->assertSame([null, null], $this->locate('App\\Models\\Company'));
    }

    /** @return iterable<array{0: string, 1: string, 2: string}> path, context, layer */
    private function contextFiles(): iterable
    {
        foreach ($this->phpFiles(self::ROOT.'/app/Domains') as $path) {
            $parts = explode('/', substr($this->relative($path), strlen('app/Domains/')));

            yield [$path, $parts[0], $parts[1] ?? ''];
        }
    }

    /**
     * Which context and layer a class belongs to, or [null, null] if it isn't under App\Domains.
     *
     * @return array{0: ?string, 1: ?string}
     */
    private function locate(string $class): array
    {
        if (! str_starts_with($class, self::DOMAINS)) {
            return [null, null];
        }

        $parts = explode('\\', substr($class, strlen(self::DOMAINS)));

        return [$parts[0], $parts[1] ?? null];
    }

    private function isLayer(string $class, string $context, string $layer): bool
    {
        return str_starts_with($class, self::DOMAINS."{$context}\\{$layer}\\");
    }

    /** PHP's own classes (DateTimeImmutable, InvalidArgumentException, …) carry no namespace. */
    private function isGlobal(string $class): bool
    {
        return ! str_contains($class, '\\');
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
     * Top-level `use` imports (including aliased and grouped `use A\{B, C as D};`) plus
     * fully-qualified names written inline. Indented `use` lines are trait uses and are skipped;
     * unqualified same-namespace references never cross a boundary, so they're ignored.
     *
     * @return list<string>
     */
    private function referencedClasses(string $path): array
    {
        $source = file_get_contents($path);
        $classes = [];

        preg_match_all('/^use\s+(?:function\s+|const\s+)?([^;]+);/m', $source, $imports);

        foreach ($imports[1] as $import) {
            $import = trim($import);
            $brace = strpos($import, '{');

            if ($brace !== false) {
                $prefix = rtrim(substr($import, 0, $brace), '\\');

                foreach (explode(',', rtrim(substr($import, $brace + 1), '}')) as $member) {
                    $classes[] = $prefix.'\\'.$this->withoutAlias($member);
                }

                continue;
            }

            $classes[] = $this->withoutAlias($import);
        }

        preg_match_all('/(?<![\w\\\\])\\\\([A-Z]\w*(?:\\\\\w+)+)/', $source, $inline);

        return array_values(array_unique([...$classes, ...$inline[1]]));
    }

    private function withoutAlias(string $import): string
    {
        return trim(preg_split('/\s+as\s+/i', trim($import))[0]);
    }

    private function relative(string $path): string
    {
        return str_replace('\\', '/', substr($path, strlen(realpath(self::ROOT)) + 1));
    }
}
