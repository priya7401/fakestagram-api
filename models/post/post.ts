import mongoose from "mongoose";
import { attachmentSchema, Attachment } from "../attachment/attachment.ts";

interface PostInterface {
    likes: number,
    description: string,
    user_id: string,
    attachment: Attachment,
    comment_count: number,
    user_likes: [mongoose.Schema.Types.ObjectId]
}

const postSchema = new mongoose.Schema({
    likes: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        max: 1000
    },
    user_id: {
        type: String,
        required: true
    },
    attachment: {
        type: attachmentSchema
    },
    comment_count: {
        type: Number,
        default: 0
    },
    user_likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: []
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

const Post = mongoose.model<PostInterface>("Post", postSchema);

export { Post, PostInterface };
