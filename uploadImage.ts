#!/usr/bin/env -S deno run --allow-env --allow-read --allow-net --allow-run
import AWS from "aws-sdk";
import * as cb from "https://deno.land/x/copy_paste/mod.ts";

// setup
const s3 = new AWS.S3({
  endpoint: Deno.env.get("R2_ENDPOINT") ?? "",
  region: "auto",
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
  },
});

// // do upload path from arg or clipboard

const filepath = Deno.args[0] ?? (await cb.readText());
const filename = filepath.split("/").pop();
const ext = filename?.split(".").pop();
if (["png", "jpg", "jpeg", "gif"].indexOf(ext ?? "") === -1) {
  console.log("This is not image.");
  Deno.exit(1);
}
const file = await Deno.readFile(filepath);
await s3
  .upload({
    Bucket: "blog-images",
    Key: filename ?? "",
    ContentType: `image/${ext}`,
    Body: file,
  })
  .promise();

// stdout markdown image link
const url = encodeURI(`${Deno.env.get("R2_BUCKET_URL") ?? ""}/${filename}`);
const markdownImg = `![${filename}](${url})`;
console.log(markdownImg);
