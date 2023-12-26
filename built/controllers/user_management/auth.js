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
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { Device } from "../../models/user/device_detail.js";
import { createNewToken } from "../../app-config/app-config.js";
function register(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const email = req.body.email;
            const password = req.body.password;
            const username = req.body.username;
            if (!(email && password)) {
                res
                    .status(422)
                    .json({ message: "Please enter valid email and password" });
            }
            if (!username) {
                res.status(422).json({ message: "Please enter username" });
            }
            //check if user/username already exists
            const existingUser = yield User.findOne({
                $or: [{ email: email }, { user_name: username }],
            });
            if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.email) === email) {
                return res
                    .status(422)
                    .json({ message: "User already exists! Please login" });
            }
            else if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.user_name) === username) {
                return res.status(422).json({
                    message: "Username already exists! Please choose a different username",
                });
            }
            const hash = yield bcrypt.hash(password, 10);
            //assign 15 random follow_suggestions initially
            const follow_suggestions = yield User.aggregate([
                { $sample: { size: 15 } },
            ]).exec();
            //create new user
            var newUser = yield User.create({
                user_name: username,
                email: email,
                password_hash: hash,
                follow_suggestions: follow_suggestions.map((user) => user._id),
            });
            //create token
            const { token, invalidate_before } = createNewToken(email, newUser === null || newUser === void 0 ? void 0 : newUser.id);
            newUser.invalidate_before = invalidate_before;
            yield newUser.save();
            console.log(newUser);
            return res.status(201).json({ user: newUser.toJSON(), token: token });
        }
        catch (error) {
            next(error);
        }
    });
}
function login(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const email = req.body.email;
            const password = req.body.password;
            if (!(email && password)) {
                return res
                    .status(422)
                    .json({ "message": "Please enter valid email and password" });
            }
            var user = yield User.findOne({ "email": email });
            if (!user) {
                return res.status(404).json({ "message": "user not found" });
            }
            const match = yield bcrypt.compare(password, (_a = user === null || user === void 0 ? void 0 : user.password_hash) !== null && _a !== void 0 ? _a : "");
            if (!match) {
                return res
                    .status(422)
                    .json({ "message": "incorrect username or password" });
            }
            //adding random follow suggestions for the time being
            if (user.follow_suggestions.length < 15) {
                var follow_suggestions = yield (yield User.aggregate([
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
                ])).map((user) => {
                    return user._id;
                });
                user = yield User.findByIdAndUpdate(user._id, {
                    follow_suggestions: follow_suggestions,
                }, { new: true });
            }
            //create token
            const { token, invalidate_before } = createNewToken(email, user === null || user === void 0 ? void 0 : user.id);
            if (user) {
                user.invalidate_before = invalidate_before;
                yield (user === null || user === void 0 ? void 0 : user.save());
            }
            console.log(user);
            return res.status(201).json({ "user": user === null || user === void 0 ? void 0 : user.toJSON(), "token": token });
        }
        catch (error) {
            next(error);
        }
    });
}
function logout(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            if (!user_id) {
                return res.status(422).json({ "message": "missing query params" });
            }
            yield User.findByIdAndUpdate(user_id, {
                invalidate_before: new Date().toUTCString(),
            });
            return res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    });
}
function device_id(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get user id
            const user_id = req.app.locals.user_id;
            const platform = req.body.platform;
            const fcm_device_token = req.body.fcm_device_token;
            if (!user_id) {
                return res.status(422).json({ "message": "missing query params" });
            }
            // create new device_detail object if it does not exist for the user,
            // else update device_details and token for existing user
            const device_details = yield Device.findOneAndUpdate({ user_id: user_id }, {
                platform: platform,
                fcm_device_token: fcm_device_token,
            }, { new: true, upsert: true });
            console.log(device_details);
            return res.status(201).json({ "device_details": device_details.toJSON() });
        }
        catch (error) {
            next(error);
        }
    });
}
export { register, login, logout, device_id };
