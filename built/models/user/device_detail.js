import mongoose from "mongoose";
const deviceSchema = new mongoose.Schema({
    platform: {
        type: String,
        enum: ["android", "ios"],
    },
    fcm_device_token: {
        type: String,
        required: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
});
deviceSchema.methods.toJSON = function () {
    var obj = this.toObject();
    delete obj.user_id;
    return obj;
};
const Device = mongoose.model("device", deviceSchema);
export { Device };
