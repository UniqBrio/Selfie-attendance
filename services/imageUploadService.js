const { bucket } = require('../config/firebase'); // Adjust path if your firebase.js is elsewhere
const { v4: uuidv4 } = require('uuid');

/**
 * Uploads an image file to Firebase Storage.
 * @param {object} file - The file object (e.g., from multer, containing `buffer` and `mimetype`, `originalname`).
 * @param {string} destinationPath - The folder path in Firebase Storage (e.g., 'attendance_selfies/').
 * @returns {Promise<string>} The public URL of the uploaded image.
 * @throws {Error} If no file is provided or if upload fails.
 */
const uploadImageToFirebase = async (file, destinationPath = 'attendance_images/') => {
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
  const blob = bucket.file(filePath);

  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
    // resumable: false, // Can be useful for smaller files, but default (true) is fine.
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      console.error('Firebase Storage upload error:', err);
      reject(new Error(`Failed to upload image to Firebase Storage: ${err.message}`));
    });

    blobStream.on('finish', async () => {
      try {
        // Make the file publicly readable.
        // This requires your Firebase Storage rules to allow public reads.
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      } catch (error) {
        console.error('Error making file public or getting public URL:', error);
        reject(new Error(`Failed to make image public: ${error.message}. Check Firebase Storage rules.`));
      }
    });

    blobStream.end(file.buffer); // file.buffer should contain the image data
  });
};

module.exports = { uploadImageToFirebase };