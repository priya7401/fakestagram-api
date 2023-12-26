var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Post } from "../../models/post/post.js";
import { User } from "../../models/user/user.js";
import mongoose from "mongoose";
import sendNotification from "../../firebase-config/firebase-config.js";
import { Device } from "../../models/user/device_detail.js";
import { NotificationType } from "../../app_constants.js";
function get_user_posts(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
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
            var userPosts;
            //if follower_id is not null, get follower/following posts, else get user details
            if (follower_id && mongoose.isValidObjectId(follower_id)) {
                const follower = yield User.findById(follower_id);
                if (!follower) {
                    return res.status(422).json({ "message": "User not found!" });
                }
                if ((follower === null || follower === void 0 ? void 0 : follower.is_public) || follower.followers.includes(user_id)) {
                    userPosts = yield Post.find({ user_id: follower_id }).populate({
                        path: "user_id",
                    });
                }
                else {
                    userPosts = [];
                }
            }
            else {
                userPosts = yield Post.find({ user_id: user_id });
            }
            if (!userPosts || userPosts.length == 0) {
                return res.status(200).json({ "posts": [] });
            }
            let posts = [];
            for (let post of userPosts) {
                var customPost = post.toObject();
                //update if current user has liked this post or not
                customPost.user_liked = (_a = post.user_likes.includes(user_id)) !== null && _a !== void 0 ? _a : false;
                if (follower_id && mongoose.isValidObjectId(follower_id)) {
                    customPost.user_id = post.user_id._id;
                    customPost.user_details = post.user_id;
                }
                posts.push(customPost);
            }
            return res.status(200).json({ "posts": posts });
        }
        catch (err) {
            next(err);
        }
    });
}
function delete_post(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get post id and user id
            const { post_id } = req.query;
            const user_id = req.app.locals.user_id;
            if (!(user_id && post_id)) {
                return res.status(422).json({ "message": "missing query params" });
            }
            //delete the post
            const post = yield Post.findByIdAndDelete(post_id);
            return res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    });
}
function like_dislike_post(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get post id and user id
            const { post_id } = req.query;
            const { user_id, user } = req.app.locals;
            if (!(user_id && post_id)) {
                return res.status(422).json({ "message": "missing query params" });
            }
            const existingPost = yield Post.findById(post_id);
            if (!existingPost) {
                return res.status(404).json({ "mesage": "Post not found!" });
            }
            let updatedPost;
            if (existingPost.user_likes.includes(user_id)) {
                updatedPost = yield Post.findByIdAndUpdate(post_id, {
                    "likes": existingPost.user_likes.length - 1 >= 0
                        ? existingPost.user_likes.length - 1
                        : 0,
                    "$pull": { "user_likes": user_id },
                }, { new: true }).lean();
                updatedPost.user_liked = false;
            }
            else {
                updatedPost = yield Post.findByIdAndUpdate(post_id, {
                    "likes": existingPost.user_likes.length + 1,
                    "$push": { "user_likes": user_id },
                }, { new: true }).lean();
                updatedPost.user_liked = true;
                // notify user abt the like activity
                // get device details of the user whose post the current user liked
                const deviceDetails = yield Device.findOne({
                    user_id: existingPost.user_id,
                });
                console.log(deviceDetails);
                if (deviceDetails) {
                    yield sendNotification([deviceDetails], user, NotificationType.post_like, existingPost);
                }
            }
            return res.status(201).json({ "post": updatedPost });
        }
        catch (err) {
            next(err);
        }
    });
}
function get_feed(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ "message": "missing query params" });
            }
            let posts;
            posts = yield Post.find({ user_id: { $ne: user_id } }).populate({
                path: "user_id",
                match: {
                    "is_public": { $eq: true },
                },
            });
            if (!posts || posts.length == 0) {
                return res.status(200).json({ "posts": [] });
            }
            let feed = [];
            for (let post of posts) {
                // find() returns all docs, so the condition in populate works
                // by making the user_id = null whose accounts are not public
                if (post.user_id != null) {
                    var customPost = post.toObject();
                    //update if current user has liked this post or not
                    customPost.user_liked = (_a = post.user_likes.includes(user_id)) !== null && _a !== void 0 ? _a : false;
                    //the user_id will be like an object of type "User" as populate is used:
                    // "user_id": {"_id": "..."}
                    //FE needs to receive "user_id" as a string and not an object
                    customPost.user_id = post.user_id._id;
                    var userDetails = post.user_id;
                    customPost.user_details = userDetails;
                    feed.push(customPost);
                }
            }
            return res.status(200).json({ "posts": feed });
        }
        catch (err) {
            next(err);
        }
    });
}
function post_details(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // get post id and user id
            const { post_id } = req.query;
            const user_id = req.app.locals.user_id;
            if (!(user_id && post_id)) {
                return res.status(422).json({ "message": "missing query params" });
            }
            // get the post
            var post = yield Post.findById(post_id).populate({
                path: "user_id",
            });
            if (post != null) {
                var customPost = post.toObject();
                //update if current user has liked this post or not
                customPost.user_liked = (_a = post.user_likes.includes(user_id)) !== null && _a !== void 0 ? _a : false;
                var userDetails = post.user_id;
                customPost.user_id = userDetails._id;
                customPost.user_details = userDetails;
            }
            else {
                return res.status(404).json({ "mesage": "Post not found!" });
            }
            return res.status(200).json({ "post": customPost });
        }
        catch (err) {
            next(err);
        }
    });
}
export { get_user_posts, delete_post, like_dislike_post, get_feed, post_details, };
