import { NextFunction, Request, Response } from 'express';
import { User } from "../../models/user/user.ts";
import { get_download_url } from '../../aws-config/aws-config.ts';
import mongoose from "mongoose";
import { Device, DeviceInterface } from "../../models/user/device_detail.ts";
import sendNotification from "../../firebase-config/firebase-config.ts";
import { NotificationType } from "../../app_constants.ts";

async function get_user_details(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
      const follower = await User.findById(follower_id)
        .select("-follow_requests -follow_suggestions -pending_follow_requests")
        .exec();
      if (!follower) {
        return res.status(422).json({ message: "User not found!" });
      }
      if (follower.profile_pic?.s3_key) {
        const preSignedUrl = await get_download_url(
          follower.profile_pic?.s3_key
        );
        follower.profile_pic.s3_url = preSignedUrl;
        await follower.save();
      }
      return res.status(200).json({ "user": follower.toJSON() });
    } else {
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(422).json({ message: "User not found!" });
      }
      if (user.profile_pic?.s3_key) {
        const preSignedUrl = await get_download_url(user.profile_pic?.s3_key);
        user.profile_pic.s3_url = preSignedUrl;
        await user.save();
      }
      return res.status(200).json({ "user": user.toJSON() });
    }
  } catch (err) {
    next(err);
  }
}

async function update_profile(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const bio: string = req.body.bio;
    const s3_key: string = req.body.s3_key;
    const full_name: string = req.body.full_name;
    const user_name: string = req.body.user_name;
    const email: string = req.body.email;
    const is_public: boolean = req.body.is_public;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    var user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (user_name && user_name != "") {
      //check if username already exists
      const existingUser = await User.findOne({ user_name: user_name });

      if (existingUser?.user_name === user_name && existingUser.id != user_id) {
        return res.status(422).json({
          message:
            "Username already exists! Please choose a different username",
        });
      }
    }

    if (email && email != "") {
      //check if username already exists
      const existingUser = await User.findOne({ email: email });

      if (existingUser?.email === email && existingUser.id != user_id) {
        return res.status(422).json({
          message: "Email already exists! Please enter a different email",
        });
      }
    }

    if (s3_key) {
      const preSignedUrl = await get_download_url(s3_key);
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
    await user.save();
    return res.status(201).json({ user: user?.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function follow_requests(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    // TODO: Add logic to generate presigned url for profile pic
    const user = await User.findById(user_id).populate({
      path: "follow_requests",
      select: "user_name full_name profile_pic bio",
    });
    return res
      .status(200)
      .json({ follow_requests: user?.follow_requests ?? [] });
  } catch (err) {
    next(err);
  }
}

async function follow_sugestions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    // TODO: Add logic to generate presigned url for profile pic
    const users = await User.findById(user_id)
      .populate({
        path: "follow_suggestions",
        select: "user_name full_name profile_pic bio",
      })
      .exec();
    return res
      .status(200)
      .json({ "follow_suggestions": users?.follow_suggestions ?? [] });
  } catch (err) {
    next(err);
  }
}

async function follow_user(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const follower_id: string = req.body.follower_id;
    var user = req.app.locals.user;

    if (!user_id || !follower_id) {
      return res.status(422).json({ message: "missing params" });
    }

    if (!user.pending_follow_requests.includes(follower_id)) {
      const follower = await User.findByIdAndUpdate(
        follower_id,
        {
          $addToSet: {
            follow_requests: user_id,
          },
        },
        { new: true }
      );
      if (!follower) {
        return res.status(404).json({ message: "follower not found" });
      }

      // notify the follower about the follow request from the curr user

      // get device details of the user whose post the current user liked
      const deviceDetails: DeviceInterface | any = await Device.findOne({
        user_id: follower_id,
      });
      if (deviceDetails) {
        await sendNotification(
          [deviceDetails],
          user,
          NotificationType.follow_request
        );
      }

      //if the follower is present in curr user's follow_suggestions, remove it
      user = await User.findByIdAndUpdate(
        user_id,
        {
          $pull: {
            follow_suggestions: follower_id,
          },
          $addToSet: {
            pending_follow_requests: follower_id,
          },
        },
        { new: true }
      );
    }

    return res.status(201).json({ "user": user?.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function accept_reject_request(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const follower_id: string = req.body.follower_id;
    const accept: boolean = req.body.accept ?? false;

    if (!user_id || !follower_id) {
      return res.status(422).json({ message: "missing params" });
    }

    const follower = await User.findByIdAndUpdate(follower_id, {
      $pull: { pending_follow_requests: user_id },
    });
    if (!follower) {
      return res.status(404).json({ message: "invalid follower id" });
    }

    var user;

    if (accept) {
      user = await User.findByIdAndUpdate(
        user_id,
        {
          $pull: {
            follow_requests: follower_id,
            follow_suggestions: follower_id,
          },
          $addToSet: { followers: follower_id },
        },
        { new: true }
      );
      await User.findByIdAndUpdate(follower_id, {
        $addToSet: {
          following: user_id,
        },
      });
    } else {
      user = await User.findByIdAndUpdate(
        user_id,
        {
          $pull: { follow_requests: follower_id },
        },
        { new: true }
      );
    }

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function unfollow_user(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const follower_id: string = req.body.follower_id;

    if (!user_id || !follower_id) {
      return res.status(422).json({ message: "missing params" });
    }

    // const follower = await User.findById(follower_id);

    var user = await User.findByIdAndUpdate(
      user_id,
      {
        $pull: {
          following: follower_id,
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const follower = await User.findByIdAndUpdate(follower_id, {
      $pull: {
        followers: user_id,
      },
    });

    if (!follower) {
      return res.status(404).json({ message: "invalid follower id" });
    }

    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function followers_list(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    // TODO: Add logic to generate presigned url for profile pic
    const users = await User.findById(user_id).populate({
      path: "followers",
      select: "user_name full_name profile_pic bio",
    });
    return res.status(200).json({ followers: users?.followers ?? [] });
  } catch (err) {
    next(err);
  }
}

async function following_list(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    // TODO: Add logic to generate presigned url for profile pic
    const users = await User.findById(user_id).populate({
      path: "following",
      select: "user_name full_name profile_pic bio",
    });
    return res.status(200).json({ following: users?.following ?? [] });
  } catch (err) {
    next(err);
  }
}

async function remove_follower(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const follower_id: string = req.body.follower_id;

    if (!user_id || !follower_id) {
      return res.status(422).json({ message: "missing params" });
    }

    const follower = await User.findById(follower_id);
    if (!follower) {
      return res.status(404).json({ message: "invalid follower id" });
    }

    //remove follower from curr user
    var user = await User.findByIdAndUpdate(
      user_id,
      {
        $pull: {
          followers: follower_id,
        },
      },
      { new: true }
    );

    //remove curr user from the follower's following list
    await User.findByIdAndUpdate(follower_id, {
      $pull: {
        following: user_id,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

export {
  get_user_details,
  update_profile,
  follow_user,
  accept_reject_request,
  unfollow_user,
  follow_requests,
  follow_sugestions,
  followers_list,
  following_list,
  remove_follower,
};