const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

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

async function uploadBufferToSupabase({
  buffer,
  originalName,
  mimeType,
  folder = 'uploads',
  ownerId,
  metadata = {},
  backendUrl: optionsBackendUrl
}) {
  if (!buffer || !buffer.length) {
    throw new Error('Upload buffer is empty.');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'genelab-bucket';

  if (supabaseUrl && serviceRoleKey) {
    try {
      const { storagePath, token } = buildStoragePath(folder, ownerId, originalName);
      
      // Upload using Axios to Supabase Storage endpoint
      const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucketName}/${storagePath}`;
      
      await axios.post(uploadUrl, buffer, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': mimeType || 'application/octet-stream',
          'x-upsert': 'true'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const downloadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucketName}/${storagePath}`;

      return {
        bucketName,
        storagePath,
        downloadUrl,
        token
      };
    } catch (err) {
      console.warn('Supabase upload failed, falling back to local storage:', err.response?.data || err.message);
    }
  }

  // Local filesystem storage fallback when Supabase is not configured or fails
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const safeFile = sanitizeName(originalName);
  const localFileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeFile}`;
  const localFilePath = path.join(uploadsDir, localFileName);
  fs.writeFileSync(localFilePath, buffer);

  const backendUrl = optionsBackendUrl || process.env.BACKEND_URL || '';
  const downloadUrl = backendUrl ? `${backendUrl.replace(/\/$/, '')}/uploads/${localFileName}` : `/uploads/${localFileName}`;

  return {
    bucketName: 'local',
    storagePath: `uploads/${localFileName}`,
    downloadUrl,
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
  uploadBufferToSupabase,
  uploadBufferToFirebase: uploadBufferToSupabase, // Alias for drop-in compatibility
  downloadTextFromUrl
};