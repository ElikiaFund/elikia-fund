<?php

namespace App\Domains\Catalog\Domain\Category;

use App\Domains\Shared\Domain\AggregateRoot;
use App\Domains\Shared\Domain\CompanyId;

final class ProductCategory extends AggregateRoot
{
    private function __construct(
        private ?ProductCategoryId $id,
        private readonly CompanyId $companyId,
        private string $name,
        private ?string $icon,
        private ?string $color,
    ) {}

    public static function create(CompanyId $companyId, string $name, ?string $icon = null, ?string $color = null): self
    {
        return new self(null, $companyId, $name, $icon, $color);
    }

    public static function reconstitute(ProductCategoryId $id, CompanyId $companyId, string $name, ?string $icon, ?string $color): self
    {
        return new self($id, $companyId, $name, $icon, $color);
    }

    public function rename(string $name): void
    {
        $this->name = $name;
    }

    public function changeIcon(?string $icon): void
    {
        $this->icon = $icon;
    }

    public function changeColor(?string $color): void
    {
        $this->color = $color;
    }

    public function belongsTo(CompanyId $companyId): bool
    {
        return $this->companyId->equals($companyId);
    }

    /** @internal Called by the repository after the first save. */
    public function markPersisted(ProductCategoryId $id): void
    {
        $this->id ??= $id;
    }

    public function id(): ?ProductCategoryId
    {
        return $this->id;
    }

    public function companyId(): CompanyId
    {
        return $this->companyId;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function icon(): ?string
    {
        return $this->icon;
    }

    public function color(): ?string
    {
        return $this->color;
    }
}
