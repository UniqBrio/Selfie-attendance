const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, bucketName, publicUrl } = require('../config/r2');
const { v4: uuidv4 } = require('uuid');

/**
 * Uploads an image file to Cloudflare R2 Storage.
 * @param {object} file - The file object (e.g., from multer, containing `buffer` and `mimetype`, `originalname`).
 * @param {string} destinationPath - The folder path in R2 Storage (e.g., 'attendance_selfies/').
 * @returns {Promise<string>} The public URL of the uploaded image.
 * @throws {Error} If no file is provided or if upload fails.
 */
const uploadImageToR2 = async (file, destinationPath = 'attendance_images/') => {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided for upload.');
  }
  if (!file.originalname) {
    throw new Error('File originalname is missing.');
  }
  if (!file.mimetype) {
    throw new Error('File mimetype is missing.');
  }

  const uniqueFilename = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`; // Sanitize filename
  const filePath = `${destinationPath}${uniqueFilename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: file.buffer,
    ContentType: file.mimetype,
    // Make the object publicly readable
    ACL: 'public-read',
  });

  try {
    await r2Client.send(command);
    
    // Construct the public URL
    const imagePublicUrl = `${publicUrl}/${filePath}`;
    
    return imagePublicUrl;
  } catch (error) {
    console.error('R2 Storage upload error:', error);
    throw new Error(`Failed to upload image to R2 Storage: ${error.message}`);
  }
};

module.exports = { uploadImageToR2 };