const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/s3.config');
const path = require('path');
const crypto = require('crypto');

/**
 * Uploads a file to Cloudflare R2
 * @param {Object} file - The file object from multer (memoryStorage)
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
exports.uploadToR2 = async (file) => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
  
  const params = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    
    // Construct the public URL
    // This assumes you have configured a custom domain or use the R2 dev subdomain
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('R2 Upload Error:', error);
    throw new Error('Failed to upload image to Cloudflare R2');
  }
};
