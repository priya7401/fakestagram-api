import { NextFunction, Request, Response } from "express";
import { Post, PostInterface } from "../../models/post/post.ts";
import { User, UserInterface } from "../../models/user/user.ts";
import mongoose from "mongoose";
import sendNotification from "../../firebase-config/firebase-config.ts";
import { Device, DeviceInterface } from "../../models/user/device_detail.ts";
import { NotificationType } from "../../app_constants.ts";

interface CustomPost extends PostInterface {
  user_liked: boolean;
  user_details?: UserInterface;
}

async function get_user_posts(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const { follower_id } = req.query;

    if (!user_id) {
      return res.status(422).json({ "message": "missing query params" });
    }

    if (follower_id && !mongoose.isValidObjectId(follower_id)) {
      return res
        .status(422)
        .json({ "message": "invalid query params follower_id" });
    }

    var userPosts: [] | any;

    //if follower_id is not null, get follower/following posts, else get user details
    if (follower_id && mongoose.isValidObjectId(follower_id)) {
      const follower = await User.findById(follower_id);
      if (!follower) {
        return res.status(422).json({ "message": "User not found!" });
      }
      if (follower?.is_public || follower.followers.includes(user_id)) {
        userPosts = await Post.find({ user_id: follower_id }).populate({
          path: "user_id",
        });
      } else {
        userPosts = [];
      }
    } else {
      userPosts = await Post.find({ user_id: user_id });
    }

    if (!userPosts || userPosts.length == 0) {
      return res.status(200).json({ "posts": [] });
    }

    let posts: CustomPost[] = [];
    for (let post of userPosts) {
      var customPost: CustomPost = post.toObject();

      //update if current user has liked this post or not
      customPost.user_liked = post.user_likes.includes(user_id) ?? false;
      if (follower_id && mongoose.isValidObjectId(follower_id)) {
        customPost.user_id = post.user_id._id;
        customPost.user_details = post.user_id;
      }
      posts.push(customPost);
    }

    return res.status(200).json({ "posts": posts });
  } catch (err) {
    next(err);
  }
}

async function delete_post(req: Request, res: Response, next: NextFunction) {
  try {
    //get post id and user id
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

async function like_dislike_post(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    //get post id and user id
    const { post_id } = req.query;
    const { user_id, user } = req.app.locals;

    if (!(user_id && post_id)) {
      return res.status(422).json({ "message": "missing query params" });
    }

    const existingPost = await Post.findById(post_id);
    if (!existingPost) {
      return res.status(404).json({ "mesage": "Post not found!" });
    }

    let updatedPost: CustomPost | any;

    if (existingPost.user_likes.includes(user_id)) {
      updatedPost = await Post.findByIdAndUpdate(
        post_id,
        {
          "likes":
            existingPost.user_likes.length - 1 >= 0
              ? existingPost.user_likes.length - 1
              : 0,
          "$pull": { "user_likes": user_id },
        },
        { new: true }
      ).lean();
      updatedPost.user_liked = false;
    } else {
      updatedPost = await Post.findByIdAndUpdate(
        post_id,
        {
          "likes": existingPost.user_likes.length + 1,
          "$push": { "user_likes": user_id },
        },
        { new: true }
      ).lean();
      updatedPost.user_liked = true;

      // notify user abt the like activity

      // get device details of the user whose post the current user liked
      const deviceDetails: DeviceInterface | any = await Device.findOne({
        user_id: existingPost.user_id,
      });

      console.log(deviceDetails);

      if (deviceDetails) {
        await sendNotification(
          [deviceDetails],
          user,
          NotificationType.post_like,
          existingPost
        );
      }
    }

    return res.status(201).json({ "post": updatedPost });
  } catch (err) {
    next(err);
  }
}

async function get_feed(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ "message": "missing query params" });
    }

    let posts: [] | any;

    posts = await Post.find({ user_id: { $ne: user_id } }).populate({
      path: "user_id",
      match: {
        "is_public": { $eq: true },
      },
    });

    if (!posts || posts.length == 0) {
      return res.status(200).json({ "posts": [] });
    }

    let feed: CustomPost[] = [];
    for (let post of posts) {
      // find() returns all docs, so the condition in populate works
      // by making the user_id = null whose accounts are not public
      if (post.user_id != null) {
        var customPost: CustomPost = post.toObject();

        //update if current user has liked this post or not
        customPost.user_liked = post.user_likes.includes(user_id) ?? false;
        //the user_id will be like an object of type "User" as populate is used:
        // "user_id": {"_id": "..."}
        //FE needs to receive "user_id" as a string and not an object
        customPost.user_id = post.user_id._id;
        var userDetails: UserInterface | any = post.user_id;

        customPost.user_details = userDetails;
        feed.push(customPost);
      }
    }

    return res.status(200).json({ "posts": feed });
  } catch (err) {
    next(err);
  }
}

async function post_details(req: Request, res: Response, next: NextFunction) {
  try {
    // get post id and user id
    const { post_id } = req.query;
    const user_id = req.app.locals.user_id;

    if (!(user_id && post_id)) {
      return res.status(422).json({ "message": "missing query params" });
    }

    // get the post
    var post = await Post.findById(post_id).populate({
      path: "user_id",
    });

    if (post != null) {
      var customPost: CustomPost = post.toObject();
      //update if current user has liked this post or not
      customPost.user_liked = post.user_likes.includes(user_id) ?? false;

      var userDetails: UserInterface | any = post.user_id;
      customPost.user_id = userDetails._id;
      customPost.user_details = userDetails;
    } else {
      return res.status(404).json({ "mesage": "Post not found!" });
    }

    return res.status(200).json({ "post": customPost });
  } catch (err) {
    next(err);
  }
}

export {
  get_user_posts,
  delete_post,
  like_dislike_post,
  get_feed,
  post_details,
};
