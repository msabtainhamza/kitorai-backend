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
  likes: {
    type: Number,
    default: 0,
  },
  retweets: {
    type: Number,
    default: 0,
  },
  tweets: {
    type: Number,
    default: 0,
  },
  monthlyGrowth: {
    type: [
      {
        month: String, // e.g., "2024-01"
        followersCount: Number,
        likesCount: Number,
        retweetsCount: Number,
        tweetsCount: Number,
      },
    ],
    default: [],
  },
  yearlyGrowth: {
    type: [
      {
        year: Number,
        followersGrowth: Number,
        likesGrowth: Number,
        retweetsGrowth: Number,
        tweetsGrowth: Number,
      },
    ],
    default: [],
  },
  demographicInfo: {
    type: {
      gender: { type: String, default: "Not Provided" },
      age_range: { type: String, default: "Not Provided" },
      country: { type: String, default: "Not Provided" },
    },
    default: {},
  },
});

const UserInsights =
  mongoose.models.UserInsights || mongoose.model("Twitter", userInsightsSchema);

export default UserInsights;
