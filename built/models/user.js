import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    user_auth: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth"
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    strictPopulate: false
});
const User = mongoose.model("User", userSchema);
export { userSchema, User };
