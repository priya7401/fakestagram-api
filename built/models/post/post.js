import mongoose from "mongoose";
import { attachmentSchema, } from "../attachment/attachment.js";
const postSchema = new mongoose.Schema({
    likes: {
        type: Number,
        default: 0,
    },
    description: {
        type: String,
        max: 1000,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    attachment: {
        type: attachmentSchema,
    },
    comment_count: {
        type: Number,
        default: 0,
    },
    user_likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: [],
    },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});
const Post = mongoose.model("Post", postSchema);
export { Post };
