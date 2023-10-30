import { NextFunction, Request, Response } from 'express';
import User from '../../models/user/user.ts';
import { get_download_url } from '../../aws-config/aws-config.ts';

async function update_profile(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    const bio: string = req.body.bio;
    const s3_key: string = req.body.s3_key;
    const full_name: string = req.body.full_name;
    const user_name: string = req.body.user_name;

    if (user_name != undefined && user_name != "") {
      //check if username already exists
      const existingUser = await User.findOne({ username: user_name });

      if (
        user_name &&
        existingUser?.user_name === user_name &&
        existingUser.id != user_id
      ) {
        return res.status(422).json({
          message:
            "Username already exists! Please choose a different username",
        });
      }
    }

    var user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (s3_key) {
      const preSignedUrl = await get_download_url(s3_key);
      user.profile_pic = {
        s3_key: s3_key,
        s3_url: preSignedUrl,
      };
    }
    if (bio != undefined) {
      user.bio = bio;
    }
    if (full_name != undefined) {
      user.full_name = full_name;
    }
    if (user_name != undefined && user_name) {
      user.user_name = user_name;
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

    // const users = await User.findById(user_id)
    //   .populate({ path: "followers following", options: { _recursed: true } })
    //   .exec();
    const users = await User.findById(user_id).populate({
      path: "follow_requests",
      select: "user_name full_name profile_pic bio",
    });
    return res.status(200).json({ follow_requests: users });
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
    // //get user id
    // const user_id = req.app.locals.user_id;
    // const users = await User.find(
    //   { _id: { $ne: user_id } },
    //   "+user_name +full_name +profile_pic"
    // )
    //   // .select("+user_name +full_name +profile_pic")
    //   .exec();
    // return res.status(200).json({ "follow_suggestions": users });

    //get user id
    const user_id = req.app.locals.user_id;

    if (!user_id) {
      return res.status(422).json({ message: "missing query params" });
    }

    const users = await User.findById(user_id)
      .populate("follow_suggestions", {
        user_name: 1,
        full_name: 1,
        bio: 1,
        _id: 1,
        profile_pic: 1,
      })
      .exec();
    return res
      .status(200)
      .json({ "follow_suggestions": users?.follow_suggestions });
  } catch (err) {
    next(err);
  }
}

async function follow_user(req: Request, res: Response, next: NextFunction) {
  try {
    //get user id
    const user_id = req.app.locals.user_id;
    const follower_id: string = req.body.follower_id;

    if (!user_id || !follower_id) {
      return res.status(422).json({ message: "missing params" });
    }

    const follower = await User.findByIdAndUpdate(
      follower_id,
      {
        $push: {
          follow_requests: user_id,
        },
      },
      { new: true }
    );
    if (!follower) {
      return res.status(404).json({ message: "follower not found" });
    }

    //if the follower is present in curr user's follow_suggestions, remove it
    const user = await User.findByIdAndUpdate(
      user_id,
      {
        $pull: {
          follow_suggestions: follower_id,
        },
        $push: {
          pending_follow_requests: follower_id,
        },
      },
      { new: true }
    );

    //add the user's request to follower's follow_request
    // follower?.follow_requests.push(user_id);
    // follower.save();

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

    const follower = await User.findById(follower_id);
    if (!follower) {
      return res.status(404).json({ message: "invalid follower id" });
    }

    var user;

    if (accept) {
      user = await User.findByIdAndUpdate(
        user_id,
        {
          $pull: { follow_requests: follower_id },
          $push: { followers: follower_id },
        },
        { new: true }
      );
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

    const follower = await User.findById(follower_id);
    if (!follower) {
      return res.status(404).json({ message: "invalid follower id" });
    }

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

    const users = await User.findById(user_id).populate({
      path: "followers",
      select: "user_name full_name profile_pic bio",
    });
    return res.status(200).json({ followers: users });
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

    const users = await User.findById(user_id).populate({
      path: "following",
      select: "user_name full_name profile_pic bio",
    });
    return res.status(200).json({ following: users });
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
    await follower.updateOne({
      $pull: {
        following: follower_id,
      },
    });

    // await User.findByIdAndRemove(follower_id, {
    //   $pull: {
    //     following: follower_id,
    //   },
    // });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    return res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

export {
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