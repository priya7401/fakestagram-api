import {NextFunction, Request, Response } from 'express';
import User from '../../models/user/user.ts';
import { get_download_url } from '../../aws-config/aws-config.ts';

async function get_user_posts(req: Request, res: Response, next: NextFunction) {
    try {
        //get user id
        const {id} = req.query;
        
        if(!id) {
            return res.status(422).json({"message": "missing user id"});
        }

        //get the user
        const user = await User.findById(id);
        
        if(!user) {
            return res.status(422).json({"mesage": "User not found!"});
        }

        const userPosts = user?.posts;

        if(!userPosts) {
            return res.status(200).json({"posts": []});
        }

        //get presinged url for all the posts 
        for(let post of userPosts) {
            const preSignedUrl = await get_download_url(post.attachment?.s3_key ?? "");
            if(post.attachment) {
                post.attachment.s3_url = preSignedUrl;
            }
        }

        await user.save();
        return res.status(200).json({"posts" : userPosts});

    } catch(err) {
        next(err);
    }
}

export {get_user_posts};