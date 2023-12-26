var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { User } from "../../models/user/user.js";
import { get_download_url } from '../../aws-config/aws-config.js';
import mongoose from "mongoose";
import { Device } from "../../models/user/device_detail.js";
import sendNotification from "../../firebase-config/firebase-config.js";
import { NotificationType } from "../../app_constants.js";
function get_user_details(req, res, next) {
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
            //if follower_id is not null, get follower/following details, else get user details
            if (follower_id && mongoose.isValidObjectId(follower_id)) {
                const follower = yield User.findById(follower_id)
                    .select("-follow_requests -follow_suggestions -pending_follow_requests")
                    .exec();
                if (!follower) {
                    return res.status(422).json({ message: "User not found!" });
                }
                return res.status(200).json({ "user": follower.toJSON() });
            }
            else {
                const user = yield User.findById(user_id);
                if (!user) {
                    return res.status(422).json({ message: "User not found!" });
                }
                return res.status(200).json({ "user": user.toJSON() });
            }
        }
        catch (err) {
            next(err);
        }
    });
}
function update_profile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            const bio = req.body.bio;
            const s3_key = req.body.s3_key;
            const full_name = req.body.full_name;
            const user_name = req.body.user_name;
            const email = req.body.email;
            const is_public = req.body.is_public;
            if (!user_id) {
                return res.status(422).json({ message: "missing query params" });
            }
            var user = yield User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: "user not found" });
            }
            if (user_name && user_name != "") {
                //check if username already exists
                const existingUser = yield User.findOne({ user_name: user_name });
                if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.user_name) === user_name && existingUser.id != user_id) {
                    return res.status(422).json({
                        message: "Username already exists! Please choose a different username",
                    });
                }
            }
            if (email && email != "") {
                //check if username already exists
                const existingUser = yield User.findOne({ email: email });
                if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.email) === email && existingUser.id != user_id) {
                    return res.status(422).json({
                        message: "Email already exists! Please enter a different email",
                    });
                }
            }
            if (s3_key) {
                const preSignedUrl = yield get_download_url(s3_key);
                user.profile_pic = {
                    s3_key: s3_key,
                    s3_url: preSignedUrl,
                };
            }
            if (bio) {
                user.bio = bio;
            }
            if (full_name) {
                user.full_name = full_name;
            }
            if (user_name) {
                user.user_name = user_name;
            }
            if (email) {
                user.email = email;
            }
            if (is_public != undefined) {
                user.is_public = is_public;
            }
            yield user.save();
            return res.status(201).json({ user: user === null || user === void 0 ? void 0 : user.toJSON() });
        }
        catch (err) {
            next(err);
        }
    });
}
function follow_requests(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ message: "missing query params" });
            }
            const user = yield User.findById(user_id).populate({
                path: "follow_requests",
                select: "user_name full_name profile_pic bio",
            });
            return res
                .status(200)
                .json({ follow_requests: (_a = user === null || user === void 0 ? void 0 : user.follow_requests) !== null && _a !== void 0 ? _a : [] });
        }
        catch (err) {
            next(err);
        }
    });
}
function follow_sugestions(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ message: "missing query params" });
            }
            const users = yield User.findById(user_id).populate({
                path: "follow_suggestions",
                select: "user_name full_name profile_pic bio",
            });
            console.log(users === null || users === void 0 ? void 0 : users.follow_suggestions);
            return res
                .status(200)
                .json({ "follow_suggestions": (_a = users === null || users === void 0 ? void 0 : users.follow_suggestions) !== null && _a !== void 0 ? _a : [] });
        }
        catch (err) {
            next(err);
        }
    });
}
function follow_user(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            const follower_id = req.body.follower_id;
            var user = req.app.locals.user;
            if (!user_id || !follower_id) {
                return res.status(422).json({ message: "missing params" });
            }
            if (!user.pending_follow_requests.includes(follower_id)) {
                const follower = yield User.findByIdAndUpdate(follower_id, {
                    $addToSet: {
                        follow_requests: user_id,
                    },
                }, { new: true });
                if (!follower) {
                    return res.status(404).json({ message: "follower not found" });
                }
                // notify the follower about the follow request from the curr user
                // get device details of the user whose post the current user liked
                const deviceDetails = yield Device.findOne({
                    user_id: follower_id,
                });
                if (deviceDetails) {
                    yield sendNotification([deviceDetails], user, NotificationType.follow_request);
                }
                //if the follower is present in curr user's follow_suggestions, remove it
                user = yield User.findByIdAndUpdate(user_id, {
                    $pull: {
                        follow_suggestions: follower_id,
                    },
                    $addToSet: {
                        pending_follow_requests: follower_id,
                    },
                }, { new: true });
            }
            return res.status(201).json({ "user": user === null || user === void 0 ? void 0 : user.toJSON() });
        }
        catch (err) {
            next(err);
        }
    });
}
function accept_reject_request(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            const follower_id = req.body.follower_id;
            const accept = (_a = req.body.accept) !== null && _a !== void 0 ? _a : false;
            if (!user_id || !follower_id) {
                return res.status(422).json({ message: "missing params" });
            }
            const follower = yield User.findByIdAndUpdate(follower_id, {
                $pull: { pending_follow_requests: user_id },
            });
            if (!follower) {
                return res.status(404).json({ message: "invalid follower id" });
            }
            var user;
            if (accept) {
                user = yield User.findByIdAndUpdate(user_id, {
                    $pull: {
                        follow_requests: follower_id,
                        follow_suggestions: follower_id,
                    },
                    $addToSet: { followers: follower_id },
                }, { new: true });
                yield User.findByIdAndUpdate(follower_id, {
                    $addToSet: {
                        following: user_id,
                    },
                });
            }
            else {
                user = yield User.findByIdAndUpdate(user_id, {
                    $pull: { follow_requests: follower_id },
                }, { new: true });
            }
            if (!user) {
                return res.status(404).json({ message: "user not found" });
            }
            return res.status(201).json({ user: user.toJSON() });
        }
        catch (err) {
            next(err);
        }
    });
}
function unfollow_user(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            const follower_id = req.body.follower_id;
            if (!user_id || !follower_id) {
                return res.status(422).json({ message: "missing params" });
            }
            // const follower = await User.findById(follower_id);
            var user = yield User.findByIdAndUpdate(user_id, {
                $pull: {
                    following: follower_id,
                },
            }, { new: true });
            if (!user) {
                return res.status(404).json({ message: "user not found" });
            }
            const follower = yield User.findByIdAndUpdate(follower_id, {
                $pull: {
                    followers: user_id,
                },
            });
            if (!follower) {
                return res.status(404).json({ message: "invalid follower id" });
            }
            return res.status(201).json({ user: user.toJSON() });
        }
        catch (err) {
            next(err);
        }
    });
}
function followers_list(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ message: "missing query params" });
            }
            const users = yield User.findById(user_id).populate({
                path: "followers",
                select: "user_name full_name profile_pic bio",
            });
            return res.status(200).json({ followers: (_a = users === null || users === void 0 ? void 0 : users.followers) !== null && _a !== void 0 ? _a : [] });
        }
        catch (err) {
            next(err);
        }
    });
}
function following_list(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ message: "missing query params" });
            }
            const users = yield User.findById(user_id).populate({
                path: "following",
                select: "user_name full_name profile_pic bio",
            });
            return res.status(200).json({ following: (_a = users === null || users === void 0 ? void 0 : users.following) !== null && _a !== void 0 ? _a : [] });
        }
        catch (err) {
            next(err);
        }
    });
}
function remove_follower(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            const follower_id = req.body.follower_id;
            if (!user_id || !follower_id) {
                return res.status(422).json({ message: "missing params" });
            }
            const follower = yield User.findById(follower_id);
            if (!follower) {
                return res.status(404).json({ message: "invalid follower id" });
            }
            //remove follower from curr user
            var user = yield User.findByIdAndUpdate(user_id, {
                $pull: {
                    followers: follower_id,
                },
            }, { new: true });
            //remove curr user from the follower's following list
            yield User.findByIdAndUpdate(follower_id, {
                $pull: {
                    following: user_id,
                },
            });
            if (!user) {
                return res.status(404).json({ message: "user not found" });
            }
            return res.status(201).json({ user: user.toJSON() });
        }
        catch (err) {
            next(err);
        }
    });
}
export { get_user_details, update_profile, follow_user, accept_reject_request, unfollow_user, follow_requests, follow_sugestions, followers_list, following_list, remove_follower, };
