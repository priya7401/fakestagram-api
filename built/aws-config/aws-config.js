var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b;
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppConstants } from "../app_constants.js";
const s3Client = new S3Client({
    credentials: {
        accessKeyId: (_a = AppConstants.AWSaccessKeyId) !== null && _a !== void 0 ? _a : "",
        secretAccessKey: (_b = AppConstants.AWSsecretAccessKey) !== null && _b !== void 0 ? _b : ""
    },
    region: AppConstants.AWSregion
});
const bucket = AppConstants.AWSbucket;
const s3UploadParams = {
    Bucket: bucket,
    Key: ""
};
function get_upload_url(key) {
    return __awaiter(this, void 0, void 0, function* () {
        s3UploadParams.Key = key;
        const command = new PutObjectCommand(s3UploadParams);
        const preSignedUrl = yield getSignedUrl(s3Client, command, { expiresIn: 600 });
        return preSignedUrl;
    });
}
function get_download_url(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!key || key === "") {
            return "";
        }
        s3UploadParams.Key = key;
        const command = new GetObjectCommand(s3UploadParams);
        const preSignedUrl = yield getSignedUrl(s3Client, command, {
            expiresIn: 600,
        });
        return preSignedUrl;
    });
}
export { get_download_url, get_upload_url };
