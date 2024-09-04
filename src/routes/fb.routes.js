import { Router } from "express";
import {
  loginUser,
  getFacebookInsights,
  authCallback,
} from "../controllers/fb.controller.js";

const router = Router();

router.get("/login", loginUser);
router.get("/callback", authCallback);

router.get("/insights", getFacebookInsights);

export default router;
