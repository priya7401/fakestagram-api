import admin, { ServiceAccount } from "firebase-admin";
import { MulticastMessage } from "firebase-admin/messaging";
import { DeviceInterface } from "../models/user/device_detail.ts";
import serviceAccount from "./social-media-app-ac32b-firebase-adminsdk-9uodr-53bcb88667.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
});

async function sendNotification(
  deviceDetails: DeviceInterface[],
  user_details: any,
  post: any
) {
  const fcmTokens: string[] = deviceDetails.map(
    (deviceDetails: DeviceInterface) => deviceDetails.fcm_device_token
  );

  const message: MulticastMessage = {
    tokens: fcmTokens,
    notification: {
      title: "Post Alert!",
      body: "New post from " + user_details.user_name,
    },
    data: {
      "type": "new_post",
      user_id: user_details.id,
      post_id: post.id,
    },
  };

  await admin.messaging().sendEachForMulticast(message);
}

export default sendNotification;
