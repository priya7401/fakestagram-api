import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import AppConstants from "../app_constants.ts";
import mongoose, { Error } from "mongoose";
import { MongoError } from "mongodb";
import { User } from "../models/user/user.ts";

interface CustomJwtPayload extends jwt.JwtPayload {
  user_id: string;
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

    //   check if user exists in db
    const user = await User.findById(decoded.user_id);

    if (!user) {
      return res.status(404).json({ "mesage": "User not found!" });
    }

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

export { verifyToken, errorHandler, createNewToken };