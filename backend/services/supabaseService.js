/**
 * GenLab AI — Supabase Storage Service
 * Handles uploading files (DNA/CSV) to Supabase Storage instead of local/Railway disk.
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// The URL must be provided in the .env file.
const SUPABASE_URL = process.env.SUPABASE_URL;
// Use the secret key for backend operations.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'genelab-uploads';

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase Client initialized for Storage');
} else {
  console.warn('⚠️ SUPABASE_URL is missing in .env. Supabase storage will be disabled.');
}

/**
 * Uploads a file buffer or stream to Supabase Storage.
 * @param {Object} file - The multer file object.
 * @returns {Promise<Object>} - Contains publicUrl and path.
 */
async function uploadToSupabase(file) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const ext = path.extname(file.originalname);
  const filename = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
  const filePath = `uploads/${filename}`;

  // Read the file if it's stored temporarily on disk by multer
  const fileData = fs.readFileSync(file.path);

  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(filePath, fileData, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase Upload Error: ${error.message}`);
  }

  // Get the public URL
  const { data: publicUrlData } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  // Clean up the local temporary file
  try {
    fs.unlinkSync(file.path);
  } catch (err) {
    console.warn(`Failed to delete temporary local file: ${file.path}`);
  }

  return {
    key: filePath,
    url: publicUrlData.publicUrl
  };
}

/**
 * Uploads a file buffer directly to Supabase Storage.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} originalname - The original file name.
 * @param {string} mimetype - The file MIME type.
 * @param {string} folder - Optional subfolder name.
 * @returns {Promise<Object>} - Contains url and path.
 */
async function uploadBufferToSupabase({ buffer, originalname, mimetype, folder = 'misc' }) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const ext = path.extname(originalname);
  const filename = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
  const filePath = `${folder}/${filename}`;

  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase Upload Error: ${error.message}`);
  }

  const { data: publicUrlData } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    storagePath: filePath,
    downloadUrl: publicUrlData.publicUrl
  };
}

module.exports = {
  supabase,
  uploadToSupabase,
  uploadBufferToSupabase,
  BUCKET_NAME
};
