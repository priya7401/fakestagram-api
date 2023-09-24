import User from "../../models/user/user.ts";
import bcrypt from "bcrypt";
import AppConstants from "../../app_constants.ts";
import jwt from "jsonwebtoken";
import {NextFunction, Request, Response } from 'express';

async function register(req: Request, res: Response, next: NextFunction) {

    try {
        const email: string = req.body.email;
        const password: string = req.body.password;
        const username: string = req.body.username;

        if(!(email && password)) {
            res.status(422).json({"message": "Please enter valid email and password"});
        }
        //check if user/username already exists
        const existingUser = await User.findOne({$or: [
            {email: email},
            {username: username}
        ]});

        if(existingUser?.email === email) {
            return res.status(422).json({"message": "User already exists! Please login"});
        } else if(existingUser?.username === username) {
            return res.status(422).json({"message": "Username already exists! Please choose a different username"});
        }

        const hash = await bcrypt.hash(password, 10);

        //assign token
        const token = jwt.sign({email : email}, AppConstants.jwtTokenKey ?? "", {expiresIn : "600s"});

        //create new user
        var newUser = await User.create({
            username : username,
            email : email,
            password_hash : hash
        });

        console.log(newUser);
        return res.status(201).json({"user" : newUser, "token" : token});

    } catch(error) {
        next(error);
    }
}

async function login(req: Request, res: Response, next: NextFunction) {

    try {
        const email: string = req.body.email;
        const password: string = req.body.password;
        if(!(email && password)) {
            return res.status(422).json({"message": "Please enter valid email and password"});
        }

        var user = await User.findOne({email : email}).select('password_hash').exec();
        
        if(!user) {
            return res.status(422).json({"message" : "user not found"});
        } 

        const match = await bcrypt.compare(password, user?.password_hash ?? "");

        if(!match) {
            return res.status(422).json({"message" : "incorrect username or password"});
        }
        //create token
        const token = jwt.sign({email : email}, AppConstants.jwtTokenKey ?? "", {expiresIn : "600s"});

        return res.status(201).json({"user" : user, "token" : token});
    } catch(error) {
        next(error);
    }
}

export {register, login};