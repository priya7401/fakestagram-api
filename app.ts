import express, {Express} from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import router from "./routes.js";
import morgan from "morgan";
import AppConstants from "./app_constants.js";
import { errorHandler } from "./app-config/app-config.ts";


const app: Express = express();

//API logging
app.use(morgan("combined"));
//used when query is sent inside body
app.use(bodyParser.json());  
//defining base url
app.use("/api/v1", router);

//connect to DB
async function run(): Promise<void> {
    await mongoose.connect(AppConstants.mongoURI ?? "");
}
run().catch(err => console.log(err));
  
app.listen(AppConstants.apiPort ?? 3000, function() {
    console.log("Server started on port " + AppConstants.apiPort);
});

app.use(errorHandler);