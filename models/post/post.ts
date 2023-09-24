import mongoose from "mongoose";
import attachmentSchema from "../attachment/attachment.ts";

const postSchema = new mongoose.Schema({
    likes : {
        type : Number,
        default : 0
    },
    description : {
        type : String,
        max : 1000
    },
    user_id : {
        type : String,
        required : true
    },
    attachment: {
        type: attachmentSchema
    }
}, {timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

const Post = mongoose.model("Post", postSchema);

export {Post, postSchema};
