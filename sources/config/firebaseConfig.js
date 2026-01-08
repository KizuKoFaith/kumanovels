const admin = require("firebase-admin");
const path = require("path");

// Only require dotenv in local development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
}

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    // Fix private key formatting for Vercel
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
      );
    }
  } else {
    // Local development path
    serviceAccount = require(
      path.resolve(__dirname, "./serviceAccountKey.json"),
    );
  }
} catch (error) {
  console.error("Firebase credential load failed:", error.message);
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://justmynovels-af3fb-default-rtdb.firebaseio.com",
  });
}

// Export the database instance
module.exports = admin.database();
