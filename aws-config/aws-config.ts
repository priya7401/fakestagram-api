import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppConstants } from "../app_constants.ts";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: AppConstants.AWSaccessKeyId ?? "",
        secretAccessKey: AppConstants.AWSsecretAccessKey ?? ""
    },
    region: AppConstants.AWSregion
});

const bucket = AppConstants.AWSbucket;

const s3UploadParams = {
    Bucket: bucket,
    Key: ""
};

async function get_upload_url(key: string) {

    s3UploadParams.Key = key;

    const command = new PutObjectCommand(s3UploadParams);

    const preSignedUrl = await getSignedUrl(
        s3Client,
        command,
        { expiresIn: 600 }
    );

    return preSignedUrl;
}

async function get_download_url(key: string) {

    if (!key || key === "") {
        return "";
    }

    s3UploadParams.Key = key;

    const command = new GetObjectCommand(s3UploadParams);

    const preSignedUrl = await getSignedUrl(
        s3Client,
        command,
        { expiresIn: 600 }
    );

    return preSignedUrl;
}

export { get_download_url, get_upload_url };