var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import jwt from "jsonwebtoken";
import { AppConstants } from "../app_constants.js";
import { Error } from "mongoose";
import { User } from "../models/user/user.js";
import mung from "express-mung";
import { get_download_url } from "../aws-config/aws-config.js";
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let token = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : "";
        token = token.split(" ")[1]; //remove "Bearer" string from token
        if (!token) {
            return res.status(401).send("Unauthorized request");
        }
        const decoded = jwt.verify(token, (_b = AppConstants.jwtTokenKey) !== null && _b !== void 0 ? _b : "");
        if (decoded.user_id) {
            //local variable, available only through the lifetime of the request
            req.app.locals.user_id = decoded.user_id;
        }
        else {
            return res.status(401).send("Unauthorized request");
        }
        // check if user exists in db
        const user = yield User.findById(decoded.user_id);
        if (!user) {
            return res.status(404).json({ "mesage": "User not found!" });
        }
        req.app.locals.user = user;
        //if the user has logged out and logs back in with the same token
        //(before the expiry time defined in the jwt token during signing the token),
        //this check is used to prevent the same
        if (user.invalidate_before) {
            const date = new Date().toUTCString();
            if (date >= user.invalidate_before) {
                return res.status(401).send("Unauthorized request");
            }
        }
        next();
    }
    catch (err) {
        console.log(err);
        return res.status(401).send("Unauthorized request");
    }
});
const errorHandler = (error, req, res, next) => {
    console.log(error);
    if (error instanceof Error.ValidationError) {
        const messages = Object.values(error.errors).map((err) => err.message);
        return res.status(422).json({
            success: false,
            message: "Could not create user due to some invalid fields!",
            error: messages,
        });
    }
    else if (error.code === 11000) {
        return res.status(422).json({
            success: false,
            message: "A user with this this unique key already exists!",
        });
    }
    return res
        .status(500)
        .json({ success: false, message: "Internal server error", error });
};
const createNewToken = (email, id) => {
    var _a;
    const token = jwt.sign({ email: email, user_id: id }, (_a = AppConstants.jwtTokenKey) !== null && _a !== void 0 ? _a : "", { expiresIn: "600s" });
    const time = new Date();
    time.setUTCSeconds(time.getUTCSeconds() + 600);
    const invalidate_before = time.toUTCString();
    return { token: token, invalidate_before: invalidate_before };
};
const _getProfilePicPresignedUrl = (user) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e;
    if ((_c = user === null || user === void 0 ? void 0 : user.profile_pic) === null || _c === void 0 ? void 0 : _c.s3_key) {
        const presigned_url = yield get_download_url((_e = (_d = user === null || user === void 0 ? void 0 : user.profile_pic) === null || _d === void 0 ? void 0 : _d.s3_key) !== null && _e !== void 0 ? _e : "");
        user.profile_pic.s3_url = presigned_url;
    }
    return user;
});
const _getPostPresignedUrl = (post) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g, _h;
    if ((_f = post === null || post === void 0 ? void 0 : post.attachment) === null || _f === void 0 ? void 0 : _f.s3_key) {
        const presigned_url = yield get_download_url((_h = (_g = post === null || post === void 0 ? void 0 : post.attachment) === null || _g === void 0 ? void 0 : _g.s3_key) !== null && _h !== void 0 ? _h : "");
        post.attachment.s3_url = presigned_url;
    }
    return post;
});
const mungTransformer = (body, req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k;
    try {
        // when single user details are returned
        if (body === null || body === void 0 ? void 0 : body.user) {
            body.user = yield _getProfilePicPresignedUrl(body === null || body === void 0 ? void 0 : body.user);
        }
        // when single post details are returned
        if (body === null || body === void 0 ? void 0 : body.post) {
            body.post = yield _getPostPresignedUrl(body === null || body === void 0 ? void 0 : body.post);
            if ((_j = body === null || body === void 0 ? void 0 : body.post) === null || _j === void 0 ? void 0 : _j.user_details) {
                body.post.user_details = yield _getProfilePicPresignedUrl((_k = body === null || body === void 0 ? void 0 : body.post) === null || _k === void 0 ? void 0 : _k.user_details);
            }
        }
        // following list
        if (Array.isArray(body === null || body === void 0 ? void 0 : body.following)) {
            for (var user of body === null || body === void 0 ? void 0 : body.following) {
                user = yield _getProfilePicPresignedUrl(user);
            }
        }
        // when list of posts are returned along with user details
        if (Array.isArray(body === null || body === void 0 ? void 0 : body.posts)) {
            for (var post of body === null || body === void 0 ? void 0 : body.posts) {
                post = yield _getPostPresignedUrl(post);
                if (post === null || post === void 0 ? void 0 : post.user_details) {
                    post.user_details = yield _getProfilePicPresignedUrl(post === null || post === void 0 ? void 0 : post.user_details);
                }
            }
        }
        // follow_suggestions list
        if (Array.isArray(body === null || body === void 0 ? void 0 : body.follow_suggestions)) {
            for (var user of body === null || body === void 0 ? void 0 : body.follow_suggestions) {
                user = yield _getProfilePicPresignedUrl(user);
            }
        }
        // follow_requests list
        if (Array.isArray(body === null || body === void 0 ? void 0 : body.follow_requests)) {
            for (var user of body === null || body === void 0 ? void 0 : body.follow_requests) {
                user = yield _getProfilePicPresignedUrl(user);
            }
        }
        // followers list
        if (Array.isArray(body === null || body === void 0 ? void 0 : body.followers)) {
            for (var user of body === null || body === void 0 ? void 0 : body.followers) {
                user = yield _getProfilePicPresignedUrl(user);
            }
        }
        return body !== null && body !== void 0 ? body : {};
    }
    catch (error) {
        console.log(">>>>>>>>> mungTransformer error: ", error);
        return body !== null && body !== void 0 ? body : {};
    }
});
const attachmentMiddleware = mung.jsonAsync(mungTransformer);
export { verifyToken, errorHandler, createNewToken, attachmentMiddleware };
