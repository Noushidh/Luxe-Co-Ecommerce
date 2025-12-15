

import mongoose from "mongoose";

const adminschema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password_hash: {
    type: String,
    required: true
     }
})

const Admin = mongoose.model('Admin', adminschema)
export default Admin;
//export to admin controller