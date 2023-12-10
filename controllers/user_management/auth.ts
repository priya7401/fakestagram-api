import { User } from "../../models/user/user.ts";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { get_download_url } from "../../aws-config/aws-config.ts";
import { Device } from "../../models/user/device_detail.ts";
import { createNewToken } from "../../app-config/app-config.ts";

async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const email: string = req.body.email;
    const password: string = req.body.password;
    const username: string = req.body.username;

    if (!(email && password)) {
      res
        .status(422)
        .json({ message: "Please enter valid email and password" });
    }
    if (!username) {
      res.status(422).json({ message: "Please enter username" });
    }
    //check if user/username already exists
    const existingUser = await User.findOne({
      $or: [{ email: email }, { user_name: username }],
    });

    if (existingUser?.email === email) {
      return res
        .status(422)
        .json({ message: "User already exists! Please login" });
    } else if (existingUser?.user_name === username) {
      return res.status(422).json({
        message: "Username already exists! Please choose a different username",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    //assign 15 random follow_suggestions initially
    const follow_suggestions = await User.aggregate([
      { $sample: { size: 15 } },
    ]).exec();

    //create new user
    var newUser = await User.create({
      user_name: username,
      email: email,
      password_hash: hash,
      follow_suggestions: follow_suggestions.map((user) => user._id),
    });

    //create token
    const { token, invalidate_before } = createNewToken(email, newUser?.id);
    newUser.invalidate_before = invalidate_before;
    await newUser.save();

    console.log(newUser);
    return res.status(201).json({ user: newUser.toJSON(), token: token });
  } catch (error) {
    next(error);
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const email: string = req.body.email;
    const password: string = req.body.password;

    if (!(email && password)) {
      return res
        .status(422)
        .json({ "message": "Please enter valid email and password" });
    }

    var user = await User.findOne({ "email": email });

    if (!user) {
      return res.status(404).json({ "message": "user not found" });
    }

    const match = await bcrypt.compare(password, user?.password_hash ?? "");

    if (!match) {
      return res
        .status(422)
        .json({ "message": "incorrect username or password" });
    }

    //adding random follow suggestions for the time being
    if (user.follow_suggestions.length < 15) {
      var follow_suggestions = await (
        await User.aggregate([
          { $project: { _id: 1 } },
          {
            $match: {
              _id: {
                $ne: new mongoose.Types.ObjectId(user._id),
              },
            },
          },
          {
            $match: {
              $expr: {
                $not: [{ $in: ["$_id", user.pending_follow_requests] }],
              },
            },
          },
          {
            $match: {
              $expr: {
                $not: [{ $in: ["$_id", user.followers] }],
              },
            },
          },
          {
            $match: {
              $expr: {
                $not: [{ $in: ["$_id", user.following] }],
              },
            },
          },
          {
            $match: {
              $expr: {
                $not: [{ $in: ["$_id", user.follow_requests] }],
              },
            },
          },
          { $sample: { size: 15 } },
        ])
      ).map((user) => {
        return user._id;
      });

      user = await User.findByIdAndUpdate(
        user._id,
        {
          follow_suggestions: follow_suggestions,
        },
        { new: true }
      );
    }

    if (user && user?.profile_pic?.s3_key != null) {
      const preSignedUrl = await get_download_url(user.profile_pic?.s3_key);
      user.profile_pic.s3_url = preSignedUrl;
    }

    //create token
    const { token, invalidate_before } = createNewToken(email, user?.id);
    if (user) {
      user.invalidate_before = invalidate_before;
      await user?.save();
    }

    console.log(user);

    return res.status(201).json({ "user": user?.toJSON(), "token": token });
  } catch (error) {
    next(error);
  }
}

async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ "message": "missing query params" });
    }

    await User.findByIdAndUpdate(user_id, {
      invalidate_before: new Date().toUTCString(),
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function device_id(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const platform: string = req.body.platform;
    const fcm_device_token: string = req.body.fcm_device_token;

    if (!user_id) {
      return res.status(422).json({ "message": "missing query params" });
    }

    // create new device_detail object if it does not exist for the user,
    // else update device_details and token for existing user
    const device_details = await Device.findOneAndUpdate(
      { user_id: user_id },
      {
        platform: platform,
        fcm_device_token: fcm_device_token,
      },
      { new: true, upsert: true }
    );

    console.log(device_details);

    return res.status(201).json({ "device_details": device_details.toJSON() });
  } catch (error) {
    next(error);
  }
}

export { register, login, logout, device_id };
