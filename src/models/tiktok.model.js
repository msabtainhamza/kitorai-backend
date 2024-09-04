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
  following: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  demographicInfo: {
    type: Object,
    default: {
      gender: "Not Provided",
      age_range: "Not Provided",
      country: "Not Provided",
    },
  },
  monthlyGrowth: [
    {
      month: {
        type: String,
        required: true,
      },
      followersCount: {
        type: Number,
        default: 0,
      },
      likesCount: {
        type: Number,
        default: 0,
      },
      viewsCount: {
        type: Number,
        default: 0,
      },
    },
  ],
  yearlyGrowth: [
    {
      year: {
        type: Number,
        required: true,
      },
      followersGrowth: {
        type: Number,
        default: 0,
      },
      likesGrowth: {
        type: Number,
        default: 0,
      },
      viewsGrowth: {
        type: Number,
        default: 0,
      },
    },
  ],
});

const UserInsights =
  mongoose.models.UserInsights || mongoose.model("TikTok", userInsightsSchema);

export default UserInsights;
