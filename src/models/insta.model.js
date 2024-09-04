import mongoose from "mongoose";

const userInsightsSchema = new mongoose.Schema({
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
  views: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  following: {
    type: Number,
    default: 0,
  },
  recentPosts: [
    {
      message: String,
      createdTime: Date,
    },
  ],
  monthlyGrowth: {
    type: Array,
    default: [],
  },
  yearlyGrowth: {
    type: Array,
    default: [],
  },
  demographicInfo: {
    type: Object,
    default: {},
  },
});

const UserInsights =
  mongoose.models.UserInsights ||
  mongoose.model("Instagram", userInsightsSchema);

export default UserInsights;
