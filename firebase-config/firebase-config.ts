import admin, { ServiceAccount } from "firebase-admin";
import { MulticastMessage } from "firebase-admin/messaging";
import { DeviceInterface } from "../models/user/device_detail.ts";
import serviceAccount from "./social-media-app-ac32b-firebase-adminsdk-9uodr-53bcb88667.json";
import { NotificationType } from "../app_constants.ts";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
});

async function sendNotification(
  deviceDetails: DeviceInterface[],
  user_details: any,
  notification_type: NotificationType,
  post?: any
) {
  const fcmTokens: string[] = deviceDetails.map(
    (deviceDetails: DeviceInterface) => deviceDetails.fcm_device_token
  );

  console.log("FCM notification sent to following device tokens: ", fcmTokens);

  var title: string = "";
  var body: string = "";

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

  const message: MulticastMessage = {
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

  await admin.messaging().sendEachForMulticast(message);
}

export default sendNotification;
