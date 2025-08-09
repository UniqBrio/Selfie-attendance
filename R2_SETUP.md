# Cloudflare R2 Setup Guide

This application now uses Cloudflare R2 for image storage instead of Firebase Storage. Follow these steps to set up your R2 bucket:

## 1. Create a Cloudflare R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket with a unique name
4. Note down your bucket name

## 2. Generate R2 API Tokens

1. Go to **Manage R2 API tokens** in your Cloudflare dashboard
2. Create a new token with:
   - **Custom token** for maximum control
   - **Object Read and Write** permissions for your bucket
   - Optionally restrict to specific bucket if you have multiple
3. Save the **Access Key ID** and **Secret Access Key**

## 3. Get Your Account ID

1. In the Cloudflare dashboard, you can find your **Account ID** in the right sidebar of any page
2. Your R2 endpoint will be: `https://[account-id].r2.cloudflarestorage.com`

## 4. Set up Public Access (Optional)

For direct public access to images:
1. Go to your R2 bucket settings
2. Configure **Custom Domain** or use the default R2.dev subdomain
3. Set up **Public access** if you want images to be directly accessible via URL

## 5. Environment Variables

Update your `.env` file with the following variables:

```bash
# Cloudflare R2 Storage Configuration
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="your-r2-bucket-name"
R2_PUBLIC_URL="https://your-custom-domain.com"  # or https://your-bucket.your-account-id.r2.dev
```

## 6. Testing

After setting up the environment variables:
1. Restart your development server
2. Test image upload functionality
3. Verify images are stored in your R2 bucket
4. Check that public URLs are working correctly

## Benefits of R2 over Firebase Storage

- **Cost-effective**: No egress fees for most use cases
- **S3 Compatible**: Uses standard S3 API
- **Global CDN**: Built-in Cloudflare CDN
- **Better Performance**: Faster upload/download speeds
- **No Vendor Lock-in**: Easy to migrate due to S3 compatibility

## Troubleshooting

- Ensure your R2 API token has the correct permissions
- Verify the bucket name and endpoint URL are correct
- Check that public access is properly configured if using direct URLs
- For CORS issues, configure CORS settings in your R2 bucket
