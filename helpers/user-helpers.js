var db=require('../config/connection')
var collection=require('../config/collections');
const bcrypt=require('bcrypt');
const { response } = require('express');
const { FindCursor } = require('mongodb');
var objectId=require('mongodb').ObjectId

const paypal = require('paypal-rest-sdk');

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AYTtrUMmLZDSgTVGdhZSmaOsO4ZtnMTLQrB2iCSxZWbJAjXrM3bcijz_sPu_A_AEMv6-eiEsLmnPipo5',
    'client_secret': 'EBxqkaGhemXfL0Q7IkKxWXnNjItApX3XpYBmRfXylW4MUTeIAwDspxB54jN-JH-2ojCPC9oyclEVyluX'
  });



module.exports={


    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                let id=data.insertedId
                db.get().collection(collection.USER_COLLECTION).findOne({_id:id}).then((data)=>{
                    resolve(data)

                })

                
            })


        })
        
    },


     doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log('login success');
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('login failed incorrect password');
                        response.err='invalid password'
                        resolve(response)
                    }
                })
            }else{
                console.log('login failed user not found');
                response.err='invalid username'
                resolve(response)
            }
        })

    },


    addToCart:(proId,userId)=>{
        let proObj={
            item:objectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                console.log(proExist);
                if(proExist!=-1){

                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }).then((response)=>{
                        resolve()
                    })

                }else{

                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:objectId(userId)},{
                    $push:{
                        products:proObj
                    }

                }).then((response)=>{
                    resolve()
                })}

            }else{
                let cartObj={
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },

    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,
                        product:{$arrayElemAt:['$product',0]}

                    }
                }
                
            
            ]).toArray()

           // console.log(cartItems[0].product);
          
            resolve(cartItems)
        })
    },

    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity:(details)=>{

        details.quantity=parseInt(details.quantity)
        count=parseInt(details.count)

        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:objectId(details.cart)},
                {
                    $pull:{products:{item:objectId(details.product)}}
                }
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{

            db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':count}
                    }
                    ).then((response)=>{
                        resolve({status:true})
                    })
                }
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart.products.length>0){
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity',
                        
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                },
                
                {
                   
                    $group:{
                       
                        _id:null,
                        
                        total:{$sum:{$multiply:['$quantity','$product.price']}}
                    }

                }
                
            
            ]).toArray()

            resolve(total[0].total)
            }else{
                resolve(0)
            }
        })
    },


    removeProduct:(userId,proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({user:objectId(userId)},
            {
                $pull:{'products':{'item':objectId(proId)}}
            }).then((response)=>{
                resolve(response)
            })
        })
    },


    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(order,products,total);
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date().toDateString(),
                time:new Date().toLocaleTimeString()
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                resolve(response.insertedId)
            })
        })

    },

    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },


    getUserOrders:(userId)=>{
        console.log(userId);
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).toArray()
            console.log(orders);
            resolve(orders)
        })
    },

    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,
                        product:{$arrayElemAt:['$product',0]}

                    }
                }
                
            
            ]).toArray()
        console.log(orderItems);
          
            resolve(orderItems)
        })

    },


    generatePaypal:(orderId,total)=>{
        
        return new Promise((resolve,reject)=>{
           
            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success",
                    "cancel_url": "http://localhost:3000/cancel"
                },
                
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "item",
                            "sku": orderId,
                            "price": total,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": total
                    },
                    "description":orderId
                }]
            };
            

            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    console.log(error)
                } else {
                    console.log("Create Payment Response");
                    console.log(payment);
                    db.get().collection(collection.PAYPAL_PAYMENT_COLLECTION).insertOne(payment)
                    resolve(payment)
                  
                }
            });

        })
        
    },


    getPaymentAmount:(paymentId)=>{
        return new Promise(async(resolve,reject)=>{
            let paymentObj=await db.get().collection(collection.PAYPAL_PAYMENT_COLLECTION).findOne({id:paymentId})
            if(paymentObj){
                let total=paymentObj.transactions[0].amount.total
                console.log(total);
                resolve(total)
            }
        })
    },


    executePaypal:(payerId,paymentId,total)=>{
        return new Promise((resolve,reject)=>{

            const execute_payment_json = {
                "payer_id": payerId,
                "transactions": [{
                    "amount": {
                        "currency": "USD",
                        "total": total
                    }
                }]
              };
            
              paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    console.log(error.response);
                    throw error;
                } else {
                    console.log(JSON.stringify(payment));
                    resolve(JSON.stringify(payment))
                }
            });
           
        })
    },


    getPaymentOrderid:(paymentId)=>{
        return new Promise(async(resolve,reject)=>{
            let paymentObj=await db.get().collection(collection.PAYPAL_PAYMENT_COLLECTION).findOne({id:paymentId})
            if(paymentObj){
                let orderId=paymentObj.transactions[0].description
                console.log(orderId);
                resolve(orderId)
            }
        })
    },


    changeOrderStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{status:'placed'}
            }
            ).then(()=>{
                resolve()
            })
        })
    },


    paypalResponse:(paypalObj)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PAYPAL_RESPONSE_COLLECTION).insertOne(paypalObj).then(()=>{
                

            })
        })
    }


}