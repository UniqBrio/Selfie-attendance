const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 configuration using S3-compatible API
const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' for region
  endpoint: process.env.R2_ENDPOINT, // Your R2 endpoint URL
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL; // Your R2 public URL (custom domain or R2.dev URL)

module.exports = {
  r2Client,
  bucketName,
  publicUrl
};
