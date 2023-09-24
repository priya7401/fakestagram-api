import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    s3_key : {
        type : String,
        required : true
    },
    s3_url : {
        type : String,
        default : ""
    }
});

export default attachmentSchema;