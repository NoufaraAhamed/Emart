var db=require('../config/connection')
var collection=require('../config/collections');
const { response } = require('express');
const bcrypt=require('bcrypt');
var objectId=require('mongodb').ObjectId




module.exports={

    addProduct:(product,callback)=>{
       // console.log(product);
       product.price=parseFloat(product.price)
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
            console.log(data);
            callback(data.insertedId)
        })
    },

    getAllProducts:()=>{

        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProduct:(proId)=>{

        return new Promise((resolve,reject)=>{
            //console.log(objectId(proId));
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(proId)}).then((response)=>{
                console.log(response);
                resolve(response)
            })
        })


    },

    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
                resolve(product)
            })

        })
    },

    updateProduct:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},{
                $set:{
                    Name:proDetails.Name,
                    category:proDetails.category,
                    description:proDetails.description,
                    price:proDetails.price


                }
            }).then((response)=>{
                resolve()

            })
        })
    },

    doAdminLogin:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let admin=await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:adminData.Email})
            if(admin){
                
                    if(admin.password===adminData.password){
                        console.log('login success');
                        response.admin=admin
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('login failed incorrect password');
                        response.err='invalid password'
                        resolve(response)
                    }
              
            }else{
                console.log('login failed user not found');
                response.err='invalid username'
                resolve(response)
            }
        })
        

    }


    
      
        



    


}