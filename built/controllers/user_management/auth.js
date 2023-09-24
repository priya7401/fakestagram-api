var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { UserAuth } from "../../models/user_auth.js";
import { User } from "../../models/user.js";
import bcrypt from "bcrypt";
import AppConstants from "../../app_constants.js";
import jwt from "jsonwebtoken";
import { Error } from 'mongoose';
const saltRounds = AppConstants.saltRounds;
function register(req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const email = req.body.email;
            const password = req.body.password;
            if (!(email && password)) {
                res.status(400).send("Please enter valid email and password");
            }
            //check if user already exists
            const existingUserAuth = yield UserAuth.findOne({ email: email });
            if (existingUserAuth) {
                return res.status(409).send("User already exists! Please login");
            }
            const hash = yield bcrypt.hash(password, 10);
            //assign token
            const token = jwt.sign({ email: email }, (_a = AppConstants.jwtTokenKey) !== null && _a !== void 0 ? _a : "", { expiresIn: 600 });
            //create new user
            const newUserAuth = yield UserAuth.create({
                email: email,
                password: hash,
                token: token
            });
            var newUser = yield User.create({
                user_auth: newUserAuth._id
            });
            newUser = yield newUser.populate('user_auth');
            console.log(newUser);
            return res.status(201).json(newUser);
        }
        catch (error) {
            console.log(error);
            if (error instanceof Error.ValidationError) {
                const messages = Object.values(error.errors).map((err) => err.message);
                return res.status(422).json({
                    success: false,
                    message: 'Could not create user due to some invalid fields!',
                    error: messages,
                });
            }
            else if (error.code === 11000) {
                return res.status(422).json({
                    success: false,
                    message: 'A user with this this unique key already exists!',
                });
            }
            return res
                .status(500)
                .json({ success: false, message: 'Internal server error', error });
        }
    });
}
function login(req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const email = req.body.email;
            const password = req.body.password;
            if (!(email && password)) {
                return res.status(400).send("Please enter valid email and password");
            }
            var userAuth = yield UserAuth.findOne({ email: email }).select("+password");
            if (!userAuth) {
                return res.status(403).json({ "message": "user not found" });
            }
            else {
                const match = yield bcrypt.compare(password, (_a = userAuth.password) !== null && _a !== void 0 ? _a : "");
                if (match) {
                    //create token
                    const token = jwt.sign({ email: email }, (_b = AppConstants.jwtTokenKey) !== null && _b !== void 0 ? _b : "", { expiresIn: 600 });
                    userAuth.token = token;
                    const user = yield User.find().populate({
                        path: 'user_auth',
                        match: { email: { $eq: email } },
                        select: '-_id'
                    })
                        .exec();
                    console.log(user);
                    return res.status(201).json(user);
                }
                else {
                    return res.status(403).json({ "message": "incorrect username or password" });
                }
            }
        }
        catch (error) {
            console.log(error);
            if (error instanceof Error.ValidationError) {
                const messages = Object.values(error.errors).map((err) => err.message);
                return res.status(422).json({
                    success: false,
                    message: 'Could not create user due to some invalid fields!',
                    error: messages,
                });
            }
            else if (error.code === 11000) {
                return res.status(422).json({
                    success: false,
                    message: 'A user with this this unique key already exists!',
                });
            }
            return res
                .status(500)
                .json({ success: false, message: 'Internal server error', error });
        }
    });
}
export { register, login };
