const admin = require("firebase-admin");
const path = require("path");
// Load .env from the project root
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

let serviceAccount;

try {
  // Option A: Use the environment variable if it exists (for Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    // Option B: Fallback to the local file (for Local Dev)
    // This file is now ignored by git thanks to your .gitignore
    serviceAccount = require(
      path.resolve(__dirname, "./serviceAccountKey.json"),
    );
  }
} catch (error) {
  console.error("Failed to load Firebase credentials:", error);
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://justmynovels-af3fb-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();
module.exports = db;
