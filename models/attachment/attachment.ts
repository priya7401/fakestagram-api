import mongoose from "mongoose";

interface AttachmentInterface {
  s3_key: string;
  s3_url: string;
}

const attachmentSchema = new mongoose.Schema({
    s3_key: {
        type: String,
        required: true
    },
    s3_url: {
        type: String
    }
});

export { attachmentSchema, AttachmentInterface };