import { Router } from "express";
import {
  loginUser,
  authCallback,
  getTikTokInsights,
} from "../controllers/tiktok.controller.js";

const router = Router();

router.get("/login", loginUser);

router.get("/callback", authCallback);
router.get("/insights", getTikTokInsights);

export default router;
