import mongoose from "mongoose";
import {
  attachmentSchema,
  AttachmentInterface,
} from "../attachment/attachment.ts";
import { get_download_url } from "../../aws-config/aws-config.ts";

interface PostInterface {
  likes: number;
  description: string;
  user_id: mongoose.Schema.Types.ObjectId;
  attachment: AttachmentInterface;
  comment_count: number;
  user_likes: [mongoose.Schema.Types.ObjectId];
}

const postSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

postSchema.post(/^find/, async function (res, next: any) {
  if (Array.isArray(res)) {
    res.forEach(async function (doc) {
      if (doc.attachment && doc.attachment.s3_key) {
        const preSignedUrl = await get_download_url(doc.attachment?.s3_key);
        doc.attachment.s3_url = preSignedUrl;
      }
    });
  } else {
    if (res.attachment && res.attachment.s3_key) {
      const preSignedUrl = await get_download_url(res.attachment?.s3_key);
      res.attachment.s3_url = preSignedUrl;
    }
  }
  next();
});

const Post = mongoose.model<PostInterface>("Post", postSchema);

export { Post, PostInterface };
