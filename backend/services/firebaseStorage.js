const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const { getFirebaseBucket } = require('./firebaseAdmin');

function sanitizeName(fileName) {
  return path.basename(String(fileName || 'upload'))
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_');
}

function buildStoragePath(folder, ownerId, fileName) {
  const safeFolder = String(folder || 'uploads').replace(/^\/+|\/+$/g, '');
  const safeOwner = String(ownerId || 'shared').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeFile = sanitizeName(fileName);
  const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return {
    storagePath: `${safeFolder}/${safeOwner}/${Date.now()}-${token.slice(0, 8)}-${safeFile}`,
    token
  };
}

async function uploadBufferToFirebase({
  buffer,
  originalName,
  mimeType,
  folder = 'uploads',
  ownerId,
  metadata = {}
}) {
  if (!buffer || !buffer.length) {
    throw new Error('Upload buffer is empty.');
  }

  const bucket = getFirebaseBucket();
  if (bucket) {
    try {
      const { storagePath, token } = buildStoragePath(folder, ownerId, originalName);
      const file = bucket.file(storagePath);

      await file.save(buffer, {
        resumable: false,
        metadata: {
          contentType: mimeType || 'application/octet-stream',
          metadata: {
            firebaseStorageDownloadTokens: token,
            ...metadata
          }
        }
      });

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

      return {
        bucketName: bucket.name,
        storagePath,
        downloadUrl,
        token
      };
    } catch (firebaseErr) {
      console.warn('Firebase upload failed, falling back to local storage:', firebaseErr.message);
    }
  }

  // Local filesystem storage fallback when Firebase is not configured or fails
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const safeFile = sanitizeName(originalName);
  const localFileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeFile}`;
  const localFilePath = path.join(uploadsDir, localFileName);
  fs.writeFileSync(localFilePath, buffer);

  return {
    bucketName: 'local',
    storagePath: `uploads/${localFileName}`,
    downloadUrl: `/uploads/${localFileName}`,
    token: 'local-token'
  };
}

async function downloadTextFromUrl(url) {
  const response = await axios.get(url, {
    responseType: 'text',
    timeout: 30000
  });

  return response.data;
}

module.exports = {
  uploadBufferToFirebase,
  downloadTextFromUrl
};