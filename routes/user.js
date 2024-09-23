const { response } = require('express');
var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helper')
var userHelpers=require('../helpers/user-helpers')

const paypal = require('paypal-rest-sdk');

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {

  let user=req.session.user
  console.log(user);
  let cartCount=null
  if(req.session.user){
   cartCount=await userHelpers.getCartCount(req.session.user._id)
  }

  productHelpers.getAllProducts().then((products)=>{
   // console.log(products);

    res.render('user/home',{products,user,cartCount});

  })
});

/* get product page   */

router.get('/products',(req,res)=>{
  productHelpers.getAllProducts().then((products)=>{
    // console.log(products);
 
     res.render('user/view-products',{products});
 
   })
})

router.get('/login',(req,res)=>{
  if(req.session.userLoggedIn){
    res.redirect('/')
  }else{
  res.render('user/login',{loginErr:req.session.userLoginErr})
  req.session.userLoginErr=false
 }
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{

  userHelpers.doSignup(req.body).then((response)=>{
   // console.log(response);
    req.session.userLoggedIn=true
    req.session.user=response
    res.redirect('/')
  })
  
})

router.post('/login',(req,res)=>{

  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.userLoggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
     // console.log(response.err);
      req.session.userLoginErr=response.err
      res.redirect('/login')
    }
  })

})

router.get('/logout',(req,res)=>{
  req.session.userLoggedIn=false
  req.session.user=null
  res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res)=>{
  let products=await userHelpers.getCartProducts(req.session.user._id)
  let total=0
  if(products.length!=0){
  total=await userHelpers.getTotalAmount(req.session.user._id) 
  console.log(products);
  res.render('user/cart',{products,user:req.session.user._id,total})
  }else{
    res.render('user/empty-cart')
  }
})

router.get('/add-to-cart/:id',(req,res)=>{
  console.log('api call')
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })

})


router.post('/change-product-quantity',(req,res,next)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    let products=await userHelpers.getCartProducts(req.session.user._id)
   response.total=0
  if(products.length!=0){
    response.total=await userHelpers.getTotalAmount(req.body.user)}
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})

router.get('/remove-product',(req,res)=>{
 
  userHelpers.removeProduct(req.query.user,req.query.product).then((response)=>{
    res.redirect('/cart')

  })
})

router.post('/place-order',async(req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  let total=await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,total).then(async(orderId)=>{
    if(req.body['payment-method']=='COD'){
      res.json({codSuccess:true})
    }else{
      
      userHelpers.generatePaypal(orderId,total).then((payment)=>{
      res.json(payment)
        

      })
    }
   
  })
  console.log(req.body);
})

router.get('/success',async(req,res)=>{
  const payerId=req.query.PayerID
  const paymentId=req.query.paymentId

let total=await userHelpers.getPaymentAmount(paymentId)
let orderId=await userHelpers.getPaymentOrderid(paymentId)

userHelpers.executePaypal(payerId,paymentId,total).then((response)=>{
  if(response){
    console.log(JSON.parse(response))

    console.log('payment successfull');

    userHelpers.changeOrderStatus(orderId).then(()=>{
      res.redirect('/order-Success');

      paypalRes=JSON.parse(response)
      userHelpers.paypalResponse(paypalRes).then(()=>{

      })

    })
   
    
  }
})

});

  

router.get('/cancel', (req, res) =>
 res.render('user/payment-cancel'));





router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders/:id',async(req,res)=>{
  let orders=await userHelpers.getUserOrders(req.params.id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id',async(req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})

})

module.exports = router;
