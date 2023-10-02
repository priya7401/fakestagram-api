import { NextFunction, Request, Response } from 'express';
import { get_download_url } from '../../aws-config/aws-config.ts';
import { Post, PostInterface } from '../../models/post/post.ts';

interface CustomPost extends PostInterface {
    user_liked: boolean
}

async function get_user_posts(req: Request, res: Response, next: NextFunction) {
    try {
        //get user id
        const user_id = (req.app.locals.user_id);

        if (!user_id) {
            return res.status(422).json({ "message": "missing query params" });
        }

        let userPosts = await Post.find({ user_id: user_id });

        if (!userPosts || userPosts.length == 0) {
            return res.status(200).json({ "posts": [] });
        }

        let posts = [];
        //get presinged url for all the posts 
        for (let post of userPosts) {
            var customPost: CustomPost = post.toObject();
            const preSignedUrl = await get_download_url(post.attachment?.s3_key ?? "");
            if (post.attachment) {
                customPost.attachment.s3_url = preSignedUrl;
            }
            //update if current user has liked this post or not
            customPost.user_liked = post.user_likes.includes(user_id) ?? false;
            posts.push(customPost);
        }

        return res.status(200).json({ "posts": posts });

    } catch (err) {
        next(err);
    }
}

async function delete_post(req: Request, res: Response, next: NextFunction) {
    try {
        //get post id and user if
        const { post_id } = req.query;
        const user_id = req.app.locals.user_id;

        if (!(user_id && post_id)) {
            return res.status(422).json({ "message": "missing query params" });
        }

        //delete the post
        const post = await Post.findByIdAndDelete(post_id);
        return res.status(204).send();

    } catch (err) {
        next(err);
    }
}

async function like_dislike_post(req: Request, res: Response, next: NextFunction) {
    try {
        //get post id and user if
        const { post_id } = req.query;
        const user_id = req.app.locals.user_id;

        if (!(user_id && post_id)) {
            return res.status(422).json({ "message": "missing query params" });
        }

        const existingPost = await Post.findById(post_id);
        if (!existingPost) {
            return res.status(404).json({ "mesage": "Post not found!" });
        }

        let updatedPost: CustomPost | any;

        if (existingPost.user_likes.includes(user_id)) {
            updatedPost = await Post.findByIdAndUpdate(post_id,
                {
                    "likes": (existingPost.user_likes.length - 1) >= 0 ? (existingPost.user_likes.length - 1) : 0,
                    "$pull": { "user_likes": user_id }
                }, { new: true },).lean();
            updatedPost.user_liked = false;
        } else {
            updatedPost = await Post.findByIdAndUpdate(post_id,
                {
                    "likes": existingPost.user_likes.length + 1,
                    "$push": { "user_likes": user_id }
                }, { new: true }).lean();
            updatedPost.user_liked = true;
        }

        return res.status(201).json({ "post": updatedPost });

    } catch (err) {
        next(err);
    }
}

export { get_user_posts, delete_post, like_dislike_post };