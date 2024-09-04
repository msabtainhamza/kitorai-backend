import fs from "fs";

const config = {
  host: "ec2-35-153-55-35.compute-1.amazonaws.com",
  username: "ubuntu",
  privateKey: fs.readFileSync("kitor2.pem", "utf-8"),
};

export default config;
