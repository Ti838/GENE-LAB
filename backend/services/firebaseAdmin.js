const admin = require('firebase-admin');

let firebaseApp = null;

function normalizePrivateKey(privateKey) {
  if (typeof privateKey !== 'string') return privateKey;
  let clean = privateKey.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  } else if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.slice(1, -1);
  }
  return clean.replace(/\\n/g, '\n');
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (parsed.private_key) {
        parsed.private_key = normalizePrivateKey(parsed.private_key);
      }
      return parsed;
    } catch (error) {
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

function initFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccount = getServiceAccount();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!serviceAccount || !storageBucket) {
    return null;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket
    });
  }

  firebaseApp = admin.app();
  return firebaseApp;
}

function getFirebaseAdminAuth() {
  const app = initFirebaseAdmin();
  return app ? admin.auth() : null;
}

function getFirebaseBucket() {
  const app = initFirebaseAdmin();
  return app ? admin.storage().bucket() : null;
}

module.exports = {
  admin,
  initFirebaseAdmin,
  getFirebaseAdminAuth,
  getFirebaseBucket
};