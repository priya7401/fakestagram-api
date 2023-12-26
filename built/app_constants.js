import dotenv from 'dotenv';
dotenv.config();
const AppConstants = {
    apiPort: process.env.PORT,
    mongoURI: process.env.MONGO_URI,
    saltRounds: process.env.SALT_ROUNDS,
    jwtTokenKey: process.env.JWT_TOKEN_KEY,
    AWSaccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    AWSsecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    AWSregion: process.env.S3_REGION,
    AWSbucket: process.env.S3_BUCKET,
};
var NotificationType;
(function (NotificationType) {
    NotificationType[NotificationType["new_post"] = 0] = "new_post";
    NotificationType[NotificationType["follow_request"] = 1] = "follow_request";
    NotificationType[NotificationType["post_like"] = 2] = "post_like";
})(NotificationType || (NotificationType = {}));
export { AppConstants, NotificationType };
