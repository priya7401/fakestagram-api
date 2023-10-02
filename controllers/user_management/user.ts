import { NextFunction, Request, Response } from 'express';
import User from '../../models/user/user.ts';
import { get_download_url } from '../../aws-config/aws-config.ts';

async function update_profile(req: Request, res: Response, next: NextFunction) {
    try {
        //get user id
        const user_id = (req.app.locals.user_id);

        if (!user_id) {
            return res.status(422).json({ "message": "missing query params" });
        }

        const bio: string = req.body.bio;
        const s3_key: string = req.body.s3_key;
        const full_name: string = req.body.full_name;
        const user_name: string = req.body.user_name;

        if (user_name != undefined && user_name != "") {
            //check if username already exists
            const existingUser = await User.findOne({ username: user_name });

            if (user_name && existingUser?.user_name === user_name && existingUser.id != user_id) {
                return res.status(422).json({ "message": "Username already exists! Please choose a different username" });
            }
        }

        var user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({ "message": "user not found" });
        }

        if (s3_key) {
            const preSignedUrl = await get_download_url(s3_key);
            user.profile_pic = {
                s3_key: s3_key,
                s3_url: preSignedUrl
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
        return res.status(201).json({ "user": user?.toJSON() });
    } catch (err) {
        next(err);
    }
}

export { update_profile };