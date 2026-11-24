<?php
declare(strict_types=1);

use App\Core\ApiException;
use App\Core\Database;
use App\Core\Environment;
use App\Modules\Product\Repositories\CatalogRepository;
use App\Modules\Product\Services\CatalogService;

require __DIR__ . '/bootstrap.php';
Environment::load(dirname(__DIR__) . '/.env');
$config = require dirname(__DIR__) . '/config/database.php';
$database = Environment::get('DB_TEST_DATABASE', $config['database'] . '_test');
if (!str_ends_with($database, '_test') || $database === $config['database']) throw new RuntimeException('Separate _test DB required.');
$config['database'] = $database;
$pdo = Database::connect($config);
$service = new CatalogService($pdo, new CatalogRepository($pdo));
$token = 'cms-' . bin2hex(random_bytes(6));
$categoryId = null; $productId = null;
try {
    $category = ['name'=>$token,'slug'=>$token,'short_name'=>'CMS','detail'=>'Smoke test','status'=>'active','sort_order'=>0];
    $service->saveCategory($category);
    $row = $service->categoryListing(['q'=>$token])['items'][0];
    $categoryId = (int)$row['id'];
    $product = ['name'=>$token,'sku'=>$token,'slug'=>$token,'brand'=>'Test','category'=>$token,'description'=>'CMS description','price'=>'123.45','oldPrice'=>'150.00','stock'=>3,'specs'=>['Test spec'],'featured'=>false,'image'=>'','status'=>'active'];
    $service->save($product);
    $saved = $service->listing(['q'=>$token], true)['items'][0];
    $productId = (int)$saved['id'];
    check($saved['sku'] === $token && $saved['description'] === 'CMS description' && $saved['price'] === '123.45','Product fields not persisted.');
    try { $service->save($product); throw new RuntimeException('Duplicate SKU accepted.'); }
    catch (ApiException $e) { check($e->status === 409,'Duplicate should return 409.'); }
    $service->save([...$product,'id'=>(string)$productId,'status'=>'hidden','stock'=>7,'images'=>['/assets/test-one.png','/assets/test-two.png'],'image'=>'/assets/test-two.png']);
    check($service->listing(['q'=>$token])['items'] === [],'Hidden product leaked.');
    check($service->get($productId,true)['stock'] === 7,'Edit not persisted.');
    check(count($service->get($productId,true)['images']) === 2 && $service->get($productId,true)['image'] === '/assets/test-two.png','Gallery not persisted.');
    try { $service->deleteCategory($categoryId); throw new RuntimeException('Non-empty category deleted.'); }
    catch (ApiException $e) { check($e->status === 409,'Category should be protected.'); }
    $service->delete($productId);
    check($service->listing(['q'=>$token,'status'=>'discontinued'],true)['pagination']['total'] === 1,'Soft delete missing.');
    $service->saveCategory([...$category,'id'=>(string)$categoryId,'status'=>'hidden']);
    check($service->categoryListing(['q'=>$token])['items'][0]['status'] === 'hidden','Category edit missing.');
    echo "[PASS] CMS product/category create, read, edit, hide, soft-delete, duplicate and FK protection on _test DB.\n";
} finally {
    if ($productId) {
        $pdo->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$productId]);
        $pdo->prepare('DELETE FROM products WHERE id=?')->execute([$productId]);
    }
    if ($categoryId) $service->deleteCategory($categoryId);
}
