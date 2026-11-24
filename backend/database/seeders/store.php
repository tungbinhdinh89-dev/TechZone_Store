<?php
declare(strict_types=1);

return static function (PDO $pdo, int $adminId): void {
    $lock = $pdo->query("SELECT GET_LOCK(SHA2(CONCAT(DATABASE(), ':store-seed'),256),10)")->fetchColumn();
    if ((int)$lock !== 1) throw new RuntimeException('Another store seed is running.');
    try {
    $check=$pdo->prepare('SELECT name FROM data_seeds WHERE name=?');$check->execute(['store-content-100-v2']);
    if($check->fetchColumn()!==false)return;
    $data=json_decode(file_get_contents(__DIR__.'/store-content.json'),true,512,JSON_THROW_ON_ERROR);
    $pdo->beginTransaction();
    try{
        $categories=[];
        $s=$pdo->prepare('INSERT INTO categories(name,slug,short_name,detail,sort_order) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)');
        foreach($data['categories']as$index=>$c){$s->execute([$c['name'],$c['id'],$c['short'],$c['detail'],$index]);$categories[$c['id']]=(int)$pdo->lastInsertId();}
        $s=$pdo->prepare('INSERT INTO products(category_id,sku,name,slug,brand,price,old_price,stock,description,specifications,featured) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)');
        $image=$pdo->prepare('INSERT INTO product_images(product_id,file_path,alt_text,is_primary) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE id=id');
        foreach($data['products']as$p){
            $s->execute([$categories[$p['category']],'TZ-INITIAL-'.strtoupper($p['id']),$p['name'],'initial-'.$p['id'],$p['brand'],(string)$p['price'],(string)$p['oldPrice'],$p['stock'],$p['description'] ?? $p['name'],implode("\n",$p['specs']),(int)$p['featured']]);
            $image->execute([(int)$pdo->lastInsertId(),'/assets'.$p['image'],$p['name']]);
        }
        $s=$pdo->prepare("INSERT INTO articles(author_id,title,slug,summary,content,section,thumbnail_path,status,published_at) VALUES(?,?,?,'',?,?,?,'published',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id=id");
        foreach($data['content']['articles']as$r)$s->execute([$adminId,$r['title'],'initial-'.$r['id'],$r['body'],$r['extra'],'/assets'.$r['image']]);
        $s=$pdo->prepare("INSERT INTO faqs(question,answer,status) SELECT ?,?,'active' WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question=?)");
        foreach($data['content']['faqs']as$r)$s->execute([$r['title'],$r['body'],$r['title']]);
        $s=$pdo->prepare("INSERT INTO pages(slug,title,content,extra,status) VALUES(?,?,?,?,'published') ON DUPLICATE KEY UPDATE id=id");
        foreach($data['content']['company']as$r)$s->execute(['initial-'.$r['id'],$r['title'],$r['body'],$r['extra']]);
        $s=$pdo->prepare('INSERT INTO services(name,slug,description,price,price_label) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id');
        foreach($data['content']['pricing']as$r)$s->execute([$r['title'],'initial-'.$r['id'],$r['body'],$r['extra'],'']);
        foreach($data['content']['services']as$r)$s->execute([$r['title'],'initial-'.$r['id'],$r['body'],'0.00',$r['extra']]);
        $s=$pdo->prepare("INSERT INTO site_settings(setting_key,title,setting_value) VALUES(?,?,?) ON DUPLICATE KEY UPDATE id=id");
        foreach($data['content']['settings']as$r)$s->execute([$r['id'],$r['title'],$r['body']]);
        $s->execute(['shipping_fee','Phí giao hàng',(string)$data['shipping']['fee']]);
        $s->execute(['shipping_free_from','Ngưỡng miễn phí giao hàng',(string)$data['shipping']['freeFrom']]);
        $s->execute(['hero-price','Giá banner','18990000']);
        $s->execute(['sale-ends-at','Thời điểm kết thúc ưu đãi',gmdate('c',time()+86400*7)]);
        $s=$pdo->prepare("INSERT INTO coupons(code,basis_points,max_discount) VALUES('TECHZONE5',500,500000.00) ON DUPLICATE KEY UPDATE id=id");$s->execute();
        $s=$pdo->prepare("INSERT INTO site_media(uploaded_by,title,description,file_path) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM site_media WHERE file_path=?)");
        foreach($data['content']['media']as$r)$s->execute([$adminId,$r['title'],$r['body'],'/assets'.$r['image'],'/assets'.$r['image']]);
        $pdo->prepare('INSERT INTO data_seeds(name) VALUES(?)')->execute(['store-content-100-v2']);
        $pdo->commit();
    }catch(Throwable $e){$pdo->rollBack();throw $e;}
    } finally { $pdo->query("SELECT RELEASE_LOCK(SHA2(CONCAT(DATABASE(), ':store-seed'),256))"); }
};
