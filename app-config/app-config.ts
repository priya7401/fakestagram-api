import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppConstants } from "../app_constants.ts";
import mongoose, { Error } from "mongoose";
import { MongoError } from "mongodb";
import { User, UserInterface } from "../models/user/user.ts";
import mung from "express-mung";
import { get_download_url } from "../aws-config/aws-config.ts";
import { PostInterface } from "../models/post/post.ts";

interface CustomJwtPayload extends jwt.JwtPayload {
  email: string;
}

const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.headers.authorization ?? "";
    token = token.split(" ")[1]; //remove "Bearer" string from token
    if (!token) {
      return res.status(401).send("Unauthorized request");
    }

    const decoded = jwt.verify(
      token,
      AppConstants.jwtTokenKey ?? ""
    ) as CustomJwtPayload;

    if (decoded.user_id) {
      //local variable, available only through the lifetime of the request
      req.app.locals.user_id = decoded.user_id;
    } else {
      return res.status(401).send("Unauthorized request");
    }

    // check if user exists in db
    const user = await User.findById(decoded.user_id);

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
  } catch (err) {
    console.log(err);
    return res.status(401).send("Unauthorized request");
  }
};

const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(error);

  if (error instanceof Error.ValidationError) {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(422).json({
      success: false,
      message: "Could not create user due to some invalid fields!",
      error: messages,
    });
  } else if ((error as MongoError).code === 11000) {
    return res.status(422).json({
      success: false,
      message: "A user with this this unique key already exists!",
    });
  }
  return res
    .status(500)
    .json({ success: false, message: "Internal server error", error });
};

const createNewToken = (email: string, id: mongoose.Schema.Types.ObjectId) => {
  const token = jwt.sign(
    { email: email, user_id: id },
    AppConstants.jwtTokenKey ?? "",
    { expiresIn: "600s" }
  );
  const time = new Date();
  time.setUTCSeconds(time.getUTCSeconds() + 600);
  const invalidate_before: string = time.toUTCString();

  return { token: token, invalidate_before: invalidate_before };
};

const _getProfilePicPresignedUrl = async (user: UserInterface) => {
  if (user?.profile_pic?.s3_key) {
    const presigned_url = await get_download_url(
      user?.profile_pic?.s3_key ?? ""
    );
    user.profile_pic.s3_url = presigned_url;
  }
  return user;
};

const _getPostPresignedUrl = async (post: PostInterface) => {
  if (post?.attachment?.s3_key) {
    const presigned_url = await get_download_url(
      post?.attachment?.s3_key ?? ""
    );
    post.attachment.s3_url = presigned_url;
  }
  return post;
};

const mungTransformer = async (body: any, req: Request, res: Response) => {
  try {
    // when single user details are returned
    if (body?.user) {
      body.user = await _getProfilePicPresignedUrl(body?.user as UserInterface);
    }

    // when single post details are returned
    if (body?.post) {
      body.post = await _getPostPresignedUrl(body?.post as PostInterface);
    }

    // following list
    if (Array.isArray(body?.following)) {
      for (var user of body?.following) {
        user = await _getProfilePicPresignedUrl(user as UserInterface);
      }
    }

    // when list of posts are returned along with user details
    if (Array.isArray(body?.posts)) {
      for (var post of body?.posts) {
        post = await _getPostPresignedUrl(post as PostInterface);
        if (post?.user_details) {
          post.user_details = await _getProfilePicPresignedUrl(
            post?.user_details as UserInterface
          );
        }
      }
    }

    // follow_suggestions list
    if (Array.isArray(body?.follow_suggestions)) {
      for (var user of body?.follow_suggestions) {
        user = await _getProfilePicPresignedUrl(user as UserInterface);
      }
    }

    // follow_requests list
    if (Array.isArray(body?.follow_requests)) {
      for (var user of body?.follow_requests) {
        user = await _getProfilePicPresignedUrl(user as UserInterface);
      }
    }

    // followers list
    if (Array.isArray(body?.followers)) {
      for (var user of body?.followers) {
        user = await _getProfilePicPresignedUrl(user as UserInterface);
      }
    }

    return body ?? {};
  } catch (error) {
    console.log(">>>>>>>>> mungTransformer error: ", error);
    return body ?? {};
  }
};

const attachmentMiddleware = mung.jsonAsync(mungTransformer);

export { verifyToken, errorHandler, createNewToken, attachmentMiddleware };