# Migration from Firebase Storage to Cloudflare R2

This guide documents the migration from Firebase Storage to Cloudflare R2 for the Selfie Attendance application.

## Changes Made

### 1. Dependencies
- **Removed**: `firebase-admin` package
- **Added**: `@aws-sdk/client-s3` package for R2 compatibility

### 2. Configuration Files
- **Renamed**: `config/firebase.js` → `config/r2.js`
- **Updated**: Configuration now uses S3-compatible API for R2

### 3. Environment Variables
**Old (Firebase):**
```bash
FIREBASE_TYPE=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=
FIREBASE_TOKEN_URI=
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=
FIREBASE_CLIENT_X509_CERT_URL=
FIREBASE_STORAGE_BUCKET=
FIREBASE_UNIVERSE_DOMAIN=
```

**New (R2):**
```bash
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### 4. Service Functions
- **Renamed**: `uploadImageToFirebase()` → `uploadImageToR2()`
- **Updated**: Implementation now uses S3 PutObjectCommand instead of Firebase streams

### 5. API Routes Updated
- `app/api/upload-attendance/route.js`
- `app/api/submit-attendance/route.ts`

Both routes now import and use the new R2 upload function.

## Deployment Checklist

1. [ ] Set up Cloudflare R2 bucket
2. [ ] Generate R2 API tokens
3. [ ] Update environment variables in production
4. [ ] Test image upload functionality
5. [ ] Verify public access to uploaded images
6. [ ] Remove old Firebase project (optional)

## Benefits of the Migration

1. **Cost Savings**: No egress fees for most use cases
2. **Better Performance**: Cloudflare's global CDN
3. **S3 Compatibility**: Standard API, easier to migrate in future
4. **Simplified Setup**: Fewer configuration variables needed

## Rollback Plan

If needed, you can rollback by:
1. Reinstalling `firebase-admin`
2. Reverting to the previous config and service files
3. Restoring Firebase environment variables
4. Updating API route imports

## Testing

After migration, test these features:
- [ ] Upload attendance images
- [ ] Verify images are stored in R2
- [ ] Check public URLs work correctly
- [ ] Test from different devices/browsers
