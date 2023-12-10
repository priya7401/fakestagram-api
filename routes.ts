import express, { Router } from "express";
import * as auth_controller from "./controllers/user_management/auth.ts";
import * as user_controller from "./controllers/user_management/user.ts";
import * as attachment_controller from "./controllers/attachment_management/attachment.ts";
import * as posts_controller from "./controllers/post_management/posts.ts";
import { verifyToken } from "./app-config/app-config.ts";

const router: Router = express.Router();

// user_management/auth
router.post("/user_management/auth/register", auth_controller.register);
router.post("/user_management/auth/login", auth_controller.login);

router.use(verifyToken);
router.delete("/user_management/auth/logout", auth_controller.logout);
router.post("/user_management/auth/device", auth_controller.device_id);

// attachment_management
router.post("/attachment_management/presigned_url", attachment_controller.get_presigned_url);
router.post("/attachment_management/upload_attachment", attachment_controller.upload_attachment);

// post_management
router.get("/post_management/posts", posts_controller.get_user_posts);
router.put("/post_management/posts/like", posts_controller.like_dislike_post);
router.delete("/post_management/posts", posts_controller.delete_post);
router.get("/post_management/feed", posts_controller.get_feed);
router.get("/post_management/post", posts_controller.get_post);

// user_management/user
router.get(
  "/user_management/user/user_details",
  user_controller.get_user_details
);
router.put("/user_management/user/update_profile", user_controller.update_profile);
router.get(
  "/user_management/user/follow_requests",
  user_controller.follow_requests
);
router.get(
  "/user_management/user/follow_suggestions",
  user_controller.follow_sugestions
);
router.get("/user_management/user/followers", user_controller.followers_list);
router.get("/user_management/user/following", user_controller.following_list);
router.put("/user_management/user/follow", user_controller.follow_user);
router.put(
  "/user_management/user/request",
  user_controller.accept_reject_request
);
router.put("/user_management/user/unfollow", user_controller.unfollow_user);
router.put(
  "/user_management/user/remove_follower",
  user_controller.remove_follower
);

export default router;