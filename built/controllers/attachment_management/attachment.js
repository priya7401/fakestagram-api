var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { randomUUID } from 'crypto';
import { Post } from '../../models/post/post.js';
import { get_download_url, get_upload_url } from '../../aws-config/aws-config.js';
import { User } from "../../models/user/user.js";
import sendNotification from "../../firebase-config/firebase-config.js";
import { Device } from "../../models/user/device_detail.js";
import { NotificationType } from "../../app_constants.js";
function get_presigned_url(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { file_name, file_type } = req.body;
            if (!(file_name && file_type)) {
                return res
                    .status(422)
                    .json({ "message": "Please send valid file name and file type" });
            }
            //generate unique key for the attachment
            const key = `${randomUUID()}-${file_name}`;
            const preSignedUrl = yield get_upload_url(key);
            return res.status(201).json({
                "s3_url": preSignedUrl,
                "s3_key": key,
            });
        }
        catch (err) {
            next(err);
        }
    });
}
function upload_attachment(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { s3_key, description } = req.body;
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ "message": "missing query params" });
            }
            if (!s3_key) {
                return res
                    .status(422)
                    .json({ "message": "s3 key is empty! Please provide valid details" });
            }
            const preSignedUrl = yield get_download_url(s3_key);
            //create new post
            const newPost = yield Post.create({
                user_id: user_id,
                description: description,
                attachment: {
                    s3_key: s3_key,
                    s3_url: preSignedUrl,
                },
            });
            //when new post is created, send notification to the user's followers
            const user = yield User.findById(user_id);
            //get fcm device token of all the followers
            const followersDeviceDetails = yield Device.find({
                user_id: { $in: user === null || user === void 0 ? void 0 : user.followers },
            }).populate({
                path: "user_id",
            });
            if (user != null && followersDeviceDetails.length > 0) {
                yield sendNotification(followersDeviceDetails, user, NotificationType.new_post, { post: newPost });
            }
            return res.status(201).json(newPost.toJSON());
        }
        catch (err) {
            next(err);
        }
    });
}
export { get_presigned_url, upload_attachment };
