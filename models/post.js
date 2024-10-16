// Post schema 
const mongoose=require('mongoose');
const postSchema=mongoose.Schema({
  user:{
    // it will store the user id who share the post 
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  },
  date:{
    type:Date,
    default:Date.now
  },
  content:{
    type:String
  },
  likes:[
    // it will store the id of the user who like 
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:'user'
    }
  ]
})

module.exports=mongoose.model('post',postSchema);