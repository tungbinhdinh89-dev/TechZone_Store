<?php

declare(strict_types=1);

namespace App\Modules\Product\Services;

use App\Core\ApiException;
use App\Modules\Product\Repositories\CatalogRepository;
use App\Support\Input;
use App\Support\Money;
use PDO;

final readonly class CatalogService
{
    public function __construct(private PDO $pdo, private CatalogRepository $products) {}

    public function categories(): array
    {
        return array_map(static fn (array $r) => ['id'=>$r['slug'],'name'=>$r['name'], 'short'=>$r['short_name'] ?: $r['name'],'detail'=>$r['detail']], $this->products->categories());
    }
    public function listing(array $query = [], bool $admin = false): array
    {
        $result = $this->products->listing($query, $admin);
        $result['items'] = array_map($this->present(...), $result['items']);
        return $result;
    }
    public function get(int $id, bool $admin = false): array
    {
        $row = $this->products->byIds([$id])[0] ?? null;
        if (!$row || (!$admin && ($row['status'] !== 'active' || $row['category_status'] !== 'active'))) throw new ApiException('Không tìm thấy sản phẩm.', 404);
        return $this->present($row);
    }
    public function related(array $ids): array { return array_map($this->present(...), $this->products->byIds($ids)); }
    public function save(array $data): void
    {
        $id = empty($data['id']) ? null : Input::id($data['id']);
        $existing = $id ? $this->get($id, true) : null;
        $name = Input::text($data, 'name', 200, 2);
        $category = $this->products->category(Input::text($data, 'category', 180, 1)) ?? throw new ApiException('Danh mục không tồn tại.');
        $specs = $data['specs'] ?? [];
        if (!is_array($specs) || count($specs) > 50) throw new ApiException('Thông số không hợp lệ.');
        foreach ($specs as $spec) if (!is_string($spec) || mb_strlen($spec) > 300) throw new ApiException('Thông số không hợp lệ.');
        if (!is_bool($data['featured'] ?? null)) throw new ApiException('Trạng thái nổi bật không hợp lệ.');
        $image = Input::image($data['image'] ?? '');
        $images = $data['images'] ?? null;
        if ($images !== null) {
            if (!is_array($images) || !array_is_list($images) || count($images) > 12) throw new ApiException('Tối đa 12 ảnh sản phẩm.');
            $images = array_values(array_unique(array_filter(array_map(Input::image(...),$images))));
            if ($image !== '' && !in_array($image,$images,true)) throw new ApiException('Ảnh chính phải nằm trong danh sách ảnh.');
            $image = $image ?: ($images[0] ?? '');
        }
        $status = Input::text($data + ['status' => $existing['status'] ?? 'active'], 'status', 20);
        if (!in_array($status, ['active','hidden','discontinued'],true)) throw new ApiException('Trạng thái không hợp lệ.');
        $sku = Input::text($data + ['sku' => $existing['sku'] ?? 'TZ-' . strtoupper(bin2hex(random_bytes(6)))], 'sku', 80, 1);
        $slug = Input::text($data + ['slug' => $existing['slug'] ?? Input::slug($name) . '-' . bin2hex(random_bytes(4))], 'slug', 220, 1);
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) throw new ApiException('Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
        $values = [$category,$name,Input::text($data,'brand',100,1),Money::decimal(Money::minor($data['price'] ?? '')),
            Money::decimal(Money::minor($data['oldPrice'] ?? '0')),Input::integer($data['stock'] ?? null,0,100000000),implode("\n",$specs),(int)$data['featured'],
            Input::text($data + ['description' => $existing['description'] ?? ''], 'description', 20000),$status,$sku,$slug];
        $this->pdo->beginTransaction();
        try { $id = $this->products->save($id,$values); if ($images !== null) $this->products->gallery($id,$images,$image,$name); else $this->products->image($id,$image,$name); $this->pdo->commit(); }
        catch (\Throwable $error) { $this->pdo->rollBack(); if ($error instanceof \PDOException && ($error->errorInfo[1] ?? 0) === 1062) throw new ApiException('SKU hoặc slug đã tồn tại.',409); throw $error; }
    }
    public function categoryListing(array $query): array { return $this->products->categoryListing($query); }
    public function saveCategory(array $data): void
    {
        $status = Input::text($data, 'status', 20, 1);
        $slug = Input::text($data, 'slug', 180, 1);
        if (!in_array($status,['active','hidden'],true) || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D',$slug)) throw new ApiException('Trạng thái hoặc slug không hợp lệ.');
        try { $this->products->saveCategory(empty($data['id']) ? null : Input::id($data['id']), [Input::text($data,'name',150,2),$slug,Input::text($data,'short_name',100),Input::text($data,'detail',255),$status,Input::integer($data['sort_order'] ?? 0,0,100000)]); }
        catch (\PDOException $e) { if (($e->errorInfo[1] ?? 0) === 1062) throw new ApiException('Slug danh mục đã tồn tại.',409); throw $e; }
    }
    public function deleteCategory(int $id): void
    {
        try { $this->products->deleteCategory($id); }
        catch (\PDOException $e) { if (($e->errorInfo[1] ?? 0) === 1451) throw new ApiException('Danh mục đang có sản phẩm hoặc danh mục con. Hãy ẩn thay vì xóa.',409); throw $e; }
    }
    public function delete(int $id): void { $this->get($id,true); $this->products->discontinue($id); }
    public function lock(array $ids): array
    {
        if (!$this->pdo->inTransaction()) throw new \LogicException('Inventory operations require the Sales transaction.');
        $result = [];
        foreach ($this->products->byIds($ids,true) as $row) $result[(int)$row['id']]=$row;
        return $result;
    }
    public function reserve(array $items): array
    {
        $rows = $this->lock(array_map(static fn($i)=>(int)$i['productId'],$items));
        $result = [];
        foreach ($items as $item) {
            $row = $rows[(int)$item['productId']] ?? null;
            $quantity = Input::integer($item['quantity'],1,10000);
            if (!$row || $row['status'] !== 'active' || $row['category_status'] !== 'active' || (int)$row['stock'] < $quantity) throw new ApiException('Sản phẩm không còn đủ tồn kho.',409);
            $this->products->decrement((int)$row['id'],$quantity);
            $result[] = ['productId'=>(int)$row['id'],'name'=>$row['name'],'sku'=>$row['sku'],'price'=>(string)$row['price'],'image'=>$row['image'],'quantity'=>$quantity];
        }
        return $result;
    }
    public function restore(array $items): void
    {
        $this->lock(array_map(static fn($i)=>(int)$i['productId'],$items));
        foreach ($items as $item) $this->products->restore((int)$item['productId'],(int)$item['quantity']);
    }
    public function stats(): array { return $this->products->stats(); }
    public function brands(): array { return $this->products->brands(); }
    private function present(array $row): array
    {
        return ['id'=>(string)$row['id'],'name'=>$row['name'],'brand'=>$row['brand'],'category'=>$row['category_slug'],
            'price'=>(string)$row['price'],'oldPrice'=>(string)$row['old_price'],'stock'=>(int)$row['stock'],
            'image'=>$row['image'] ?? '', 'images'=>json_decode($row['images'] ?? '[]',true) ?? [], 'specs'=>preg_split('/\r?\n/', $row['specifications'] ?? '',-1,PREG_SPLIT_NO_EMPTY),
            'featured'=>(bool)$row['featured'], 'status'=>$row['status'],'description'=>$row['description'],'sku'=>$row['sku'],'slug'=>$row['slug']];
    }
}
