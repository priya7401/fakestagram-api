import express, { Router } from "express";
import * as auth_controller from "./controllers/user_management/auth.ts";
import * as attachment_controller from "./controllers/attachment_management/attachment.ts";
import * as posts_controller from "./controllers/post_management/posts.ts";
import { verifyToken } from "./app-config/app-config.ts";

const router: Router = express.Router();

router.post("/user_management/auth/register", auth_controller.register);
router.post("/user_management/auth/login", auth_controller.login);

router.use(verifyToken);

router.post("/attachment_management/presigned_url", attachment_controller.get_presigned_url);
router.post("/attachment_management/upload_attachment", attachment_controller.upload_attachment);

router.get("/post_management/posts", posts_controller.get_user_posts);
router.put("/post_manamgement/posts/like", posts_controller.like_dislike_post);
router.delete("/posts", posts_controller.delete_post);
router.get("/feed");

export default router;