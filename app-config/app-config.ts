import {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import AppConstants from "../app_constants.ts";
import { Error } from 'mongoose';
import { MongoError } from 'mongodb';

interface CustomJwtPayload extends jwt.JwtPayload{
    user_id: string,
    email: string
  }

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.headers.authorization ?? "";
        token = token.split(' ')[1];    //remove "Bearer" string from token
        if(!token) {
            return res.status(401).send("Unauthorized request");
        }

        const decoded = jwt.verify(token, AppConstants.jwtTokenKey ?? "") as CustomJwtPayload;

        if(decoded.user_id) {
            //local variable, available only through the lifetime of the request
            req.app.locals.user_id = decoded.user_id;
        } else {
            return res.status(401).send("Unauthorized request");
        }
        next();
        
    } catch (err) {
        console.log(err);
        return res.status(401).send("Unauthorized request");
    }
}

const errorHandler = (error : Error, req: Request, res: Response, next: NextFunction) => {
    console.log(error);

    if (error instanceof Error.ValidationError) {
        const messages = Object.values(error.errors).map((err) => err.message);
        return res.status(422).json({
            success: false,
            message: 'Could not create user due to some invalid fields!',
            error: messages,
        });
        } else if ((error as MongoError).code === 11000) {
        return res.status(422).json({
            success: false,
            message: 'A user with this this unique key already exists!',
        });
        }
    return res
    .status(500)
    .json({ success: false, message: 'Internal server error', error });
}

export {verifyToken, errorHandler};