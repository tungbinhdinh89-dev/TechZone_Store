<?php

declare(strict_types=1);

namespace App\Modules\Product\Repositories;

use App\Support\Page;
use App\Support\Input;
use PDO;

final readonly class CatalogRepository
{
    private const FROM = ' FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN product_images i ON i.product_id = p.id AND i.is_primary = 1';
    private const SELECT = 'SELECT p.*, c.slug AS category_slug, c.status AS category_status, i.file_path AS image, (SELECT JSON_ARRAYAGG(pi.file_path) FROM product_images pi WHERE pi.product_id=p.id) AS images';
    public function __construct(private PDO $pdo) {}

    public function categories(): array
    {
        return $this->pdo->query("SELECT * FROM categories WHERE status = 'active' ORDER BY sort_order, id")->fetchAll();
    }
    public function category(string $slug): ?int
    {
        $statement = $this->pdo->prepare('SELECT id FROM categories WHERE slug = ?');
        $statement->execute([$slug]);
        return ($id = $statement->fetchColumn()) === false ? null : (int) $id;
    }
    public function listing(array $query, bool $admin = false): array
    {
        $where = $admin ? "p.status <> 'discontinued'" : "p.status = 'active' AND c.status = 'active'";
        $parameters = [];
        if ($admin && ($status = Input::text($query, 'status', 20)) !== '') {
            if (!in_array($status, ['active', 'hidden', 'discontinued'], true)) throw new \App\Core\ApiException('Trạng thái không hợp lệ.');
            $where = 'p.status = ?'; $parameters[] = $status;
        }
        if (isset($query['favoriteIds'])) {
            $ids = array_values(array_unique(array_map(Input::id(...), $query['favoriteIds'])));
            if ($ids === []) $where .= ' AND 0=1';
            else { $where .= ' AND p.id IN (' . implode(',', array_fill(0,count($ids),'?')) . ')'; $parameters = [...$parameters,...$ids]; }
        }
        $q = Input::text($query, 'q', 100);
        if ($q !== '') { $where .= " AND (p.name LIKE ? ESCAPE '!' OR p.sku LIKE ? ESCAPE '!' OR p.brand LIKE ? ESCAPE '!')"; $parameters = [...$parameters,...array_fill(0, 3, Page::pattern($q))]; }
        foreach (['category' => 'c.slug', 'brand' => 'p.brand'] as $key => $column) {
            $value = Input::text($query, $key, 180);
            if ($value !== '') { $where .= ' AND ' . $column . ' = ?'; $parameters[] = $value; }
        }
        if (($query['stock'] ?? '') === '1') $where .= ' AND p.stock > 0';
        if (($query['featured'] ?? '') === '1') $where .= ' AND p.featured = 1';
        if (($query['sale'] ?? '') === '1') $where .= ' AND p.old_price > p.price';
        foreach (['minPrice' => '>=', 'maxPrice' => '<='] as $key => $operator) {
            if (isset($query[$key]) && $query[$key] !== '') { $where .= ' AND p.price ' . $operator . ' ?'; $parameters[] = \App\Support\Money::decimal(\App\Support\Money::minor($query[$key])); }
        }
        $sort = ['price-asc' => 'p.price ASC, p.id', 'price-desc' => 'p.price DESC, p.id', 'name' => 'p.name, p.id', 'newest' => 'p.id DESC'][Input::text($query,'sort',30) ?: 'newest'] ?? 'p.featured DESC, p.id DESC';
        return Page::query($this->pdo, self::SELECT . self::FROM . ' WHERE ' . $where . ' ORDER BY ' . $sort,
            'SELECT COUNT(*)' . self::FROM . ' WHERE ' . $where, $parameters, $query);
    }
    public function byIds(array $ids, bool $lock = false): array
    {
        if ($ids === []) return [];
        sort($ids, SORT_NUMERIC);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $locked = [];
        if ($lock) {
            // Lock only inventory rows, in ID order; image/category joins stay read-only.
            $statement = $this->pdo->prepare('SELECT * FROM products WHERE id IN (' . $placeholders . ') ORDER BY id FOR UPDATE');
            $statement->execute($ids);
            foreach ($statement->fetchAll() as $row) $locked[(int)$row['id']] = $row;
        }
        $statement = $this->pdo->prepare(self::SELECT . self::FROM . ' WHERE p.id IN (' . $placeholders . ') ORDER BY p.id');
        $statement->execute($ids);
        // A previous nonlocking read may have established an older RR snapshot.
        // Use the current locked inventory/price values, not that snapshot.
        return array_map(static fn($row)=>array_replace($row,$locked[(int)$row['id']]??[]),$statement->fetchAll());
    }
    public function save(?int $id, array $values): int
    {
        if ($id) {
            $statement = $this->pdo->prepare('UPDATE products SET category_id=?, name=?, brand=?, price=?, old_price=?, stock=?, specifications=?, featured=?, description=?, status=?, sku=?, slug=? WHERE id=?');
            $statement->execute([...$values, $id]);
            return $id;
        }
        $statement = $this->pdo->prepare("INSERT INTO products (category_id,name,brand,price,old_price,stock,specifications,featured,description,status,sku,slug) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
        $statement->execute($values);
        return (int) $this->pdo->lastInsertId();
    }
    public function image(int $id, string $path, string $name): void
    {
        $this->pdo->prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?')->execute([$id]);
        if ($path !== '') $this->pdo->prepare('INSERT INTO product_images (product_id,file_path,alt_text,is_primary) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE is_primary=1, alt_text=?')->execute([$id, $path, $name, $name]);
    }

    public function gallery(int $id, array $paths, string $primary, string $name): void
    {
        $this->pdo->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$id]);
        $insert = $this->pdo->prepare('INSERT INTO product_images (product_id,file_path,alt_text,is_primary,sort_order) VALUES (?,?,?,?,?)');
        foreach ($paths as $index => $path) $insert->execute([$id,$path,$name,(int)($path === $primary),$index]);
    }

    public function categoryListing(array $query): array
    {
        $pattern = Page::pattern(Input::text($query, 'q', 100));
        return Page::query($this->pdo, 'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS productCount FROM categories c WHERE c.name LIKE ? ESCAPE \'!\' ORDER BY c.sort_order,c.id',
            'SELECT COUNT(*) FROM categories c WHERE c.name LIKE ? ESCAPE \'!\'', [$pattern], $query);
    }

    public function saveCategory(?int $id, array $values): void
    {
        if ($id) {
            $find = $this->pdo->prepare('SELECT id FROM categories WHERE id=?'); $find->execute([$id]);
            if (!$find->fetchColumn()) throw new \App\Core\ApiException('Không tìm thấy danh mục.', 404);
            $this->pdo->prepare('UPDATE categories SET name=?,slug=?,short_name=?,detail=?,status=?,sort_order=? WHERE id=?')->execute([...$values,$id]);
        } else $this->pdo->prepare('INSERT INTO categories (name,slug,short_name,detail,status,sort_order) VALUES (?,?,?,?,?,?)')->execute($values);
    }

    public function deleteCategory(int $id): void
    {
        $statement = $this->pdo->prepare('DELETE FROM categories WHERE id=?');
        $statement->execute([$id]);
        if (!$statement->rowCount()) throw new \App\Core\ApiException('Không tìm thấy danh mục.', 404);
    }
    public function discontinue(int $id): void
    {
        $this->pdo->prepare("UPDATE products SET status = 'discontinued' WHERE id = ?")->execute([$id]);
    }
    public function decrement(int $id, int $quantity): void
    {
        $statement = $this->pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
        $statement->execute([$quantity, $id, $quantity]);
        if ($statement->rowCount() !== 1) throw new \App\Core\ApiException('Tồn kho đã thay đổi. Vui lòng kiểm tra giỏ hàng.', 409);
    }
    public function restore(int $id, int $quantity): void
    {
        $this->pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?')->execute([$quantity, $id]);
    }
    public function stats(): array
    {
        return $this->pdo->query("SELECT COUNT(*) AS products, SUM(stock < 5) AS lowStock FROM products WHERE status = 'active'")->fetch();
    }
    public function brands(): array
    {
        return $this->pdo->query("SELECT DISTINCT brand FROM products WHERE status = 'active' AND brand <> '' ORDER BY brand")->fetchAll(PDO::FETCH_COLUMN);
    }
}
