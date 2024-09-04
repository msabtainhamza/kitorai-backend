import { Router } from "express";
import {
  loginUser,
  authCallback,
  getInsights,
} from "../controllers/twitch.controller.js";

const router = Router();

router.get("/login", loginUser);
router.get("/callback", authCallback);

router.post("/insights", getInsights);

export default router;
