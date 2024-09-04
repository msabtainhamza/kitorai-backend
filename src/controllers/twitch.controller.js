import axios from "axios";
import mongoose from "mongoose";
import UserInsights from "../models/twitch.model.js";

const loginUser = async (req, res) => {
  const redirectUri = encodeURIComponent(process.env.TWITCH_REDIRECT_URI);
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=user:read:email`;

  res.redirect(authUrl);
};

const authCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token`,
      null,
      {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: process.env.TWITCH_REDIRECT_URI,
        },
      }
    );

    const { access_token } = response.data;

    const profileResponse = await axios.get(
      `https://api.twitch.tv/helix/users`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const { id, login: username } = profileResponse.data.data[0];

    await mongoose.connect(process.env.MONGO_URI);

    let userInsights = await UserInsights.findOne({ username });

    if (!userInsights) {
      userInsights = new UserInsights({
        username,
        accessToken: access_token,
        followers: 0,
        following: 0,
        views: 0,
        clips: 0,
        hosts: 0,
        vods: 0,
        monthlyGrowth: [],
        yearlyGrowth: [],
        demographicInfo: {
          gender: "Not Provided",
          age_range: "Not Provided",
          country: "Not Provided",
        },
      });
    } else {
      userInsights.accessToken = access_token;
    }

    await userInsights.save();

    res.status(200).json({ access_token, username });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to get access token or save user data" });
  }
};

// Get insights from Twitch
const getInsights = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const userInsights = await UserInsights.findOne({ username });

    if (!userInsights) {
      return res.status(404).json({ error: "User not found" });
    }

    const { accessToken } = userInsights;

    // Fetch user insights
    const profileResponse = await axios.get(
      `https://api.twitch.tv/helix/users`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const userProfile = profileResponse.data.data[0];
    const { id: userId, login } = userProfile;

    // Fetch additional data
    const insightsResponse = await axios.get(
      `https://api.twitch.tv/helix/users/follows?to_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const followers_count = insightsResponse.data.total;
    const followingResponse = await axios.get(
      `https://api.twitch.tv/helix/users/follows?from_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const following_count = followingResponse.data.total;

    const clipsResponse = await axios.get(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const clips_count = clipsResponse.data.data.length;

    const hostsResponse = await axios.get(
      `https://api.twitch.tv/helix/streams?user_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const hosts_count = hostsResponse.data.data.length;

    const vodsResponse = await axios.get(
      `https://api.twitch.tv/helix/videos?user_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const vods_count = vodsResponse.data.data.length;

    // Monthly and yearly growth calculation
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const historicalData = await fetchHistoricalData(username, accessToken);

    for (let i = 0; i < 12; i++) {
      const start = new Date(oneYearAgo.getFullYear(), i, 1);
      const end = new Date(oneYearAgo.getFullYear(), i + 1, 0);

      const monthlyData = historicalData.filter(
        (data) => new Date(data.date) >= start && new Date(data.date) <= end
      );

      const startCount =
        monthlyData.length > 0 ? monthlyData[0].followersCount : 0;
      const endCount =
        monthlyData.length > 0
          ? monthlyData[monthlyData.length - 1].followersCount
          : 0;

      monthlyGrowth.push({
        month: start.toISOString().slice(0, 7),
        startFollowersCount: startCount,
        endFollowersCount: endCount,
        growth: endCount - startCount,
      });
    }

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    const yearlyData = historicalData.filter(
      (data) =>
        new Date(data.date) >= startOfYear && new Date(data.date) <= endOfYear
    );

    const startYearCount =
      yearlyData.length > 0 ? yearlyData[0].followersCount : 0;
    const endYearCount =
      yearlyData.length > 0
        ? yearlyData[yearlyData.length - 1].followersCount
        : 0;

    yearlyGrowth.push({
      year: now.getFullYear(),
      startFollowersCount: startYearCount,
      endFollowersCount: endYearCount,
      growth: endYearCount - startYearCount,
    });

    // Twitch API does not provide demographic information So added a placeholder as Not Provided
    const demographicResponse = await axios.get(
      `https://api.twitch.tv/helix/users`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID,
        },
      }
    );

    const demographicInfo = {
      gender: "Not Provided",
      age_range: "Not Provided",
      country: "Not Provided",
    };

    // Update user insights
    userInsights.followers = followers_count;
    userInsights.following = following_count;
    userInsights.views = 0;
    userInsights.clips = clips_count;
    userInsights.hosts = hosts_count;
    userInsights.vods = vods_count;
    userInsights.monthlyGrowth = monthlyGrowth;
    userInsights.yearlyGrowth = yearlyGrowth;
    userInsights.demographicInfo = demographicInfo;
    await userInsights.save();

    res.status(200).json(userInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

export { loginUser, authCallback, getInsights };
