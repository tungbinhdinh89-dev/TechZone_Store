<?php
declare(strict_types=1);
namespace App\Http;

use App\Application;
use App\Core\ApiException;
use App\Core\Response;
use App\Core\Session;
use App\Support\Input;
use App\Support\Uploader;

final readonly class StoreController
{
    private const GROUPS = ['articles','comments','contacts','faqs','company','services','pricing','settings','media'];

    public function __construct(private Application $app) {}

    public function snapshot(): Response
    {
        $user = $this->app->users->current();
        $admin = ($user['role'] ?? '') === 'ADMIN';
        $key = $user['id'] ?? 'guest';
        $cart = $this->app->cart->items();
        $favorites = $user ? $this->app->users->favorites((int) $user['id']) : ($_SESSION['favorites'] ?? []);
        $products = $this->app->catalog->listing(['perPage'=>24])['items'];
        $related = $this->app->catalog->related(array_values(array_unique(array_map('intval',[...array_column($cart,'productId'),...$favorites]))));
        $byId=[];foreach([...$products,...$related]as$p)$byId[$p['id']]=$p;
        $content=[];
        foreach(self::GROUPS as$group){
            if(in_array($group,['contacts','comments'],true)&&!$admin){$content[$group]=[];continue;}
            $content[$group]=$this->listData($group,['perPage'=>$group==='articles'?6:100],$admin)['items'];
        }
        $metrics = $admin ? array_merge($this->app->catalog->stats(),$this->app->orders->stats(),$this->app->contacts->stats(),
            ['members'=>$this->app->users->memberCount(),'pendingComments'=>$this->app->comments->pending()]) : $this->app->catalog->stats();
        return Response::json([
            'version'=>2,'products'=>array_values($byId),'categories'=>$this->app->catalog->categories(),
            'brands'=>$this->app->catalog->brands(),'articleSections'=>$this->app->articles->sections(),'users'=>$user?[$user]:[],
            'orders'=>$user?$this->app->orders->listing(['perPage'=>12],$admin)['items']:[],
            'carts'=>[$key=>$cart],'favorites'=>[$key=>$favorites],'content'=>$content,
            'shipping'=>$this->app->site->shipping(),'coupons'=>$this->app->orders->coupons(),
            'subscribers'=>[],'session'=>$user['id']??null,'csrfToken'=>Session::token(),'metrics'=>$metrics,
        ]);
    }

    public function listing(string $resource): Response
    {
        $admin = ($_GET['admin'] ?? '') === '1';
        if ($admin || in_array($resource,['contacts','users','categories'],true)) $this->app->users->requireAdmin();
        return Response::json($this->listData($resource,$_GET,$admin));
    }

    public function item(string $resource,string $id): Response
    {
        $admin=($_GET['admin']??'')==='1';if($admin)$this->app->users->requireAdmin();
        return Response::json(match($resource){
            'products'=>$this->app->catalog->get(Input::id($id),$admin),
            'articles'=>$this->app->articles->get(Input::id($id),$admin),
            'orders'=>$this->app->orders->get(Input::id($id),$admin),
            default=>throw new ApiException('Không tìm thấy dữ liệu.',404),
        });
    }

    private function listData(string $resource,array $query,bool $admin): array
    {
        if($resource==='products'&&($query['favorites']??'')==='1'){
            $u=$this->app->users->current();$query['favoriteIds']=$u?$this->app->users->favorites((int)$u['id']):($_SESSION['favorites']??[]);
        }else unset($query['favoriteIds']);
        return match($resource){
            'products'=>$this->app->catalog->listing($query,$admin),
            'articles'=>$this->app->articles->listing($query,$admin),
            'comments'=>$this->comments($query,$admin),
            'contacts'=>$this->app->contacts->listing($query),
            'faqs'=>$this->app->faqs->listing($query,$admin),
            'users'=>$this->users($query),
            'categories'=>$this->app->catalog->categoryListing($query),
            'orders'=>$this->app->orders->listing($query,$admin),
            'company','services','pricing','settings','media'=>$this->app->site->listing($resource,$query,$admin),
            default=>throw new ApiException('Không tìm thấy dữ liệu.',404),
        };
    }

    private function users(array $query):array
    {
        $page=$this->app->users->listing($query);
        $counts=$this->app->orders->counts(array_map('intval',array_column($page['items'],'id')));
        foreach($page['items']as&$user)$user['orderCount']=(int)($counts[$user['id']]??0);
        return $page;
    }

    private function comments(array $query,bool $admin): array
    {
        if(!$admin){
            $id=Input::id($query['articleId']??null);$this->app->articles->get($id);
        }
        return $this->app->comments->listing($query,$admin);
    }

    public function mutate(string $action): Response
    {
        Session::protect();
        $actor = str_starts_with($action,'admin-') ? $this->app->users->requireAdmin() : null;
        if($action==='admin-upload'){
            $file=Uploader::image($_FILES['image']??[]);
            $this->app->site->media($file['path'],mb_substr(basename($_FILES['image']['name']),0,200),$file['mime'],$file['size'],(int)$actor['id']);
            return Response::json($file);
        }
        if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))throw new ApiException('Yêu cầu JSON hợp lệ.',415);
        $body=file_get_contents('php://input',false,null,0,1000001);
        if(strlen($body)>1000000)throw new ApiException('Dữ liệu quá lớn.',413);
        try{$data=json_decode($body,true,64,JSON_THROW_ON_ERROR);}catch(\JsonException){throw new ApiException('JSON không hợp lệ.',400);}
        if(!is_array($data)||(array_is_list($data)&&$data!==[]))throw new ApiException('Dữ liệu không hợp lệ.',400);
        $result=null;
        switch($action){
            case 'login':$u=$this->app->users->login($data);$this->app->cart->mergeGuest((int)$u['id']);break;
            case 'register':$result=(string)$this->app->users->register($data);break;
            case 'logout':Session::signOut();break;
            case 'profile':$this->app->users->profile($data);break;
            case 'password-change':$this->app->users->changePassword($data);break;
            case 'admin-password-reset':$this->app->users->resetPassword($data);break;
            case 'cart-add':$this->app->cart->change($data,true);break;
            case 'cart-quantity':$this->app->cart->change($data);break;
            case 'favorite':
                $id=Input::id($data['productId']??null);$this->app->catalog->get($id);
                if($this->app->users->current())$this->app->users->favorite($id);
                else{$ids=$_SESSION['favorites']??[];$id=(string)$id;$_SESSION['favorites']=in_array($id,$ids,true)?array_values(array_diff($ids,[$id])):array_slice([...$ids,$id],-200);}
                break;
            case 'checkout':$result=$this->app->orders->checkout($data);break;
            case 'comment':$this->app->comments->create($data);break;
            case 'contact':$this->app->contacts->create($data);break;
            case 'newsletter':$this->app->contacts->subscribe($data);break;
            case 'admin-product-save':$this->app->catalog->save($data);break;
            case 'admin-product-delete':$this->app->catalog->delete(Input::id($data['id']??null));break;
            case 'admin-category-save':$this->app->catalog->saveCategory($data);break;
            case 'admin-category-delete':$this->app->catalog->deleteCategory(Input::id($data['id']??null));break;
            case 'admin-user-toggle':$this->app->users->toggle(Input::id($data['id']??null));break;
            case 'admin-order-status':$this->app->orders->status($data);break;
            case 'admin-shipping':$this->app->site->saveShipping($data);break;
            case 'admin-content-save':$this->saveContent($data,(int)$actor['id']);break;
            case 'admin-content-delete':$this->deleteContent($data);break;
            default:throw new ApiException('Không tìm thấy thao tác.',404);
        }
        return Response::json(['result'=>$result,'csrfToken'=>Session::token()]);
    }

    private function saveContent(array $data,int $actor): void
    {
        $group=Input::text($data,'group',30);$record=$data['record']??null;
        if(!in_array($group,self::GROUPS,true)||!is_array($record))throw new ApiException('Nhóm nội dung không hợp lệ.');
        match($group){
            'articles'=>$this->app->articles->save($record,$actor),
            'comments'=>$this->app->comments->save($record),
            'contacts'=>$this->app->contacts->save($record),
            'faqs'=>$this->app->faqs->save($record),
            default=>$this->app->site->save($group,$record,$actor),
        };
    }
    private function deleteContent(array $data): void
    {
        $group=Input::text($data,'group',30);$id=Input::text($data,'id',100,1);
        if(!in_array($group,self::GROUPS,true))throw new ApiException('Nhóm nội dung không hợp lệ.');
        match($group){
            'articles'=>$this->app->articles->delete(Input::id($id)),
            'comments'=>$this->app->comments->delete(Input::id($id)),
            'contacts'=>$this->app->contacts->delete(Input::id($id)),
            'faqs'=>$this->app->faqs->delete(Input::id($id)),
            default=>$this->app->site->delete($group,$id),
        };
    }
}
