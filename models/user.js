// Creating the User Schema 
require("dotenv").config();
const mongoose=require('mongoose');
mongoose.connect(process.env.MONGO_URL);

const userSchema=mongoose.Schema({
  username:String,
  name:String,
  age:Number,
  email:String,
  password: String,
  posts:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:'post'
    }
  ]
})

// export the model
module.exports=mongoose.model('user',userSchema);