import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Post } from '../../models/post/post.ts';
import { get_download_url, get_upload_url } from '../../aws-config/aws-config.ts';

async function get_presigned_url(req: Request, res: Response, next: NextFunction) {
    try {
        const { file_name, file_type } = req.body;

        if (!(file_name && file_type)) {
            return res.status(422).json({ "message": "Please send valid file name and file type" });
        }

        //generate unique key for the attachment
        const key = `${randomUUID()}-${file_name}`;

        const preSignedUrl = await get_upload_url(key);

        return res.status(201).json({
            "s3_url": preSignedUrl,
            "s3_key": key
        });

    } catch (err) {
        next(err);
    }
}

async function upload_attachment(req: Request, res: Response, next: NextFunction) {
    try {
        const { s3_key, description } = req.body;

        const user_id = req.app.locals.user_id;

        if (!user_id) {
            return res.status(422).json({ "message": "missing query params" });
        }

        if (!s3_key) {
            return res.status(422).json({ "message": "s3 key is empty! Please provide valid details" });
        }

        const preSignedUrl = await get_download_url(s3_key);

        //create new post
        const newPost = await Post.create({
            user_id: user_id as String,
            description: description as String,
            attachment: {
                s3_key: s3_key,
                s3_url: preSignedUrl
            }
        });

        return res.status(201).json(newPost.toJSON());

    } catch (err) {
        next(err);
    }
}


export { get_presigned_url, upload_attachment };