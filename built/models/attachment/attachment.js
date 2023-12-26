import mongoose from "mongoose";
const attachmentSchema = new mongoose.Schema({
    s3_key: {
        type: String,
        required: true,
        unique: true,
    },
    s3_url: {
        type: String,
    },
});
export { attachmentSchema };
