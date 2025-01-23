const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    token:{
        type:String,
        required:true,
        unique:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    expiresAt:{
        type:Date,
        required:true
    }
},{
    timestamps:true
})

refreshTokenSchema.index({expiresAt:1},{expireAfterSeconds:0});

const RefreshToken = monggose.model("RefreshToken",refreshTokenSchema);

module.exports = RefreshToken;