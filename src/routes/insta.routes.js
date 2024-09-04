import { Router } from "express";
import {
  loginUser,
  authCallback,
  getInstagramInsights,
} from "../controllers/insta.controller.js";

const router = new Router();

router.get("/login", loginUser);
router.get("/callback", authCallback);
router.get("/insights", getInstagramInsights);

export default router;
