import mongoose from "mongoose";

const demographicInfoSchema = new mongoose.Schema(
  {
    gender: {
      type: String,
      default: "Not Provided",
    },
    age_range: {
      type: String,
      default: "Not Provided",
    },
    country: {
      type: String,
      default: "Not Provided",
    },
  },
  { _id: false }
);

const userInsightsSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    clips: {
      type: Number,
      default: 0,
    },
    hosts: {
      type: Number,
      default: 0,
    },
    vods: {
      type: Number,
      default: 0,
    },
    monthlyGrowth: {
      type: Array,
      default: [],
    },
    yearlyGrowth: {
      type: Array,
      default: [],
    },
    demographicInfo: {
      type: demographicInfoSchema,
      default: {},
    },
  },
  { timestamps: true }
);

const UserInsights =
  mongoose.models.UserInsights || mongoose.model("Twitch", userInsightsSchema);

export default UserInsights;
