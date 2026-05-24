const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';

if (!S3_BUCKET) {
  router.post('/presign', (req, res) => {
    res.status(400).json({ message: 'S3_BUCKET not configured. Presign not available.' });
  });
} else {
  const s3 = new S3Client({ region: S3_REGION });

  router.post('/presign', async (req, res) => {
    try {
      const { filename, contentType } = req.body || {};
      const key = `${Date.now()}-${uuidv4().slice(0,8)}-${filename || 'upload'}`;
      const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType || 'application/octet-stream' });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 minutes
      return res.json({ url, key, bucket: S3_BUCKET });
    } catch (err) {
      console.error('Presign error', err);
      return res.status(500).json({ message: 'Failed to create presigned URL', error: err.message });
    }
  });
}

module.exports = router;
