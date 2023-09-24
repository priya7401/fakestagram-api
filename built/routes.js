import express from "express";
import * as auth_controller from "./controllers/user_management/auth.js";
const router = express.Router();
router.post("/user_management/auth/register", auth_controller.register);
router.post("/user_management/auth/login", auth_controller.login);
export default router;
