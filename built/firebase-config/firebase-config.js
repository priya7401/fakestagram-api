var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import admin from "firebase-admin";
import serviceAccount from "./social-media-app-ac32b-firebase-adminsdk-9uodr-53bcb88667.json"  assert { type: "json" };
import { NotificationType } from "../app_constants.js";
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
function sendNotification(deviceDetails, user_details, notification_type, post) {
    return __awaiter(this, void 0, void 0, function* () {
        const fcmTokens = deviceDetails.map((deviceDetails) => deviceDetails.fcm_device_token);
        console.log("FCM notification sent to following device tokens: ", fcmTokens);
        var title = "";
        var body = "";
        switch (notification_type) {
            case NotificationType.new_post:
                title = "Post Alert!";
                body = "New post from " + user_details.user_name;
                break;
            case NotificationType.follow_request:
                title = "Follow Request";
                body = user_details.user_name + " has requested to follow you";
                break;
            case NotificationType.post_like:
                title = "Post Activity";
                body = user_details.user_name + " has liked your post";
                break;
            default:
                break;
        }
        const message = {
            tokens: fcmTokens,
            notification: {
                title: title,
                body: body,
            },
            data: {
                "type": NotificationType[notification_type],
                "user_id": user_details.id,
                "post_id": post.id ?? "",
              },
        };
        yield admin.messaging().sendEachForMulticast(message);
    });
}
export default sendNotification;
