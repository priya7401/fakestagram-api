import {NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {Post} from '../../models/post/post.ts';
import User from '../../models/user/user.ts';
import { get_download_url, get_upload_url } from '../../aws-config/aws-config.ts';

async function get_presigned_url(req: Request, res: Response, next: NextFunction) {
    try {
        const {file_name, file_type} = req.body;

        //generate unique key for the attachment
        const key = `${randomUUID()}-${file_name}`;
        
        const preSignedUrl = await get_upload_url(key);

        return res.status(201).json({
            preSignedUrl,
            key: key
        });

    } catch(err) {
        next(err);
    }
}

async function upload_attachment(req: Request, res: Response, next: NextFunction) {
    try {
        const {s3_key, user_id, description} = req.body;

        const user = await User.findById(user_id);

        if(!user) {
            return res.status(422).send("User doesn't exist");
        }

        if(!s3_key || !user_id) {
            return res.status(422).send("s3 key or user id is empty! Please provide valid details");
        }

        const preSignedUrl = await get_download_url(s3_key);

        //create new post
        const newPost = await Post.create({
            user_id : user_id as String,
            description : description as String,
            attachment : {
                s3_key : s3_key,
                s3_url : preSignedUrl
            }
            });

        // await newPost.save();
        
        //add the new post to the user posts list
        user?.posts.push(newPost);

        await user?.save();
        console.log("/////////user: " + user);

        return res.status(201).json(newPost);

    } catch(err) {
        next(err);
    }
}


export {get_presigned_url, upload_attachment};