var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import router from "./routes.js";
import morgan from "morgan";
import * as jwt from "jsonwebtoken";
import AppConstants from "./app_constants.js";
const app = express();
//API logging
app.use(morgan("combined"));
//used when query is sent inside body
app.use(bodyParser.json());
//defining base url
app.use("/api/v1", router);
//connect to DB
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose.connect((_a = AppConstants.mongoURI) !== null && _a !== void 0 ? _a : "");
    });
}
run().catch(err => console.log(err));
// mongoose.connect(AppConstants.mongoURI ?? "");
app.listen((_a = AppConstants.apiPort) !== null && _a !== void 0 ? _a : 3000, function () {
    console.log("Server started on port " + AppConstants.apiPort);
});
const verifyToken = (req, res, next) => {
    var _a;
    const token = req.body.token;
    if (!token) {
        res.status(401).send("Unauthorized request");
    }
    try {
        const decoded = jwt.verify(token, (_a = AppConstants.jwtTokenKey) !== null && _a !== void 0 ? _a : "");
    }
    catch (err) {
        console.log(err);
        res.status(401).send("Unauthorized request");
    }
    next();
};
