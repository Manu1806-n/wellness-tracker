import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!serviceAccountBase64) {
  throw new Error("❌ Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in .env file");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, "base64").toString("utf8")
  );
} catch (err) {
  throw new Error("❌ Failed to parse Firebase service account. Check your base64 string.");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  console.log("✅ Firebase Admin initialized for project:", serviceAccount.project_id);
}

export default admin;