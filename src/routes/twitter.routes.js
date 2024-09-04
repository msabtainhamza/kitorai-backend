import { Router } from "express";
import {
  loginUser,
  authCallback,
  getTwitterInsights,
} from "../controllers/twitter.controller.js";

const router = new Router();

router.get("/login", loginUser);
router.get("/callback", authCallback);
router.get("/insights", getTwitterInsights);

export default router;
