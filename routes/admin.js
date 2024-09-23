const { response } = require('express');
var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helper')



/* GET users listing. */
router.get('/', function(req, res, next) {

  productHelpers.getAllProducts().then((products)=>{
    console.log(products);

    res.render('admin/view-products',{admin:true,products});

  })
 
});

router.get('/add-product',(req,res)=>{
  res.render('admin/add-product')
})

router.post('/add-product',(req,res)=>{
  //console.log(req.body)
  //console.log(req.files.image)
  productHelpers.addProduct(req.body,(id)=>{
    let image=req.files.image
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
      if(!err)
      res.render('admin/add-product')
      else
      console.log(err);
  })
    
  })
})

router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })
  

})

router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product',{product})
})

router.post('/edit-product/:id',(req,res)=>{
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){ 
      let image=req.files.image
      image.mv('./public/product-images/'+req.params.id+'.jpg')

    }
  })
})


router.get('/admin-login',(req,res)=>{
  if(req.session.adminLoggedIn){
    res.redirect('/admin')
  }else{
  res.render('admin/login',{loginErr:req.session.adminLoginErr})
  req.session.adminLoginErr=false
 }
})

router.post('/admin-login',(req,res)=>{

  productHelpers.doAdminLogin(req.body).then((response)=>{
    if(response.status){
      req.session.adminLoggedIn=true
      req.session.admin=response.admin
      res.redirect('/admin')
    }else{
     // console.log(response.err);
      req.session.adminLoginErr=response.err
      res.redirect('/admin/admin-login')
    }
  })

})
router.get('/admin-logout',(req,res)=>{
  req.session.adminLoggedIn=false
  req.session.admin=null
  res.redirect('/admin')
})

module.exports = router;
