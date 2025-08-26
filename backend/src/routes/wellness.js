import express from "express";
import admin from "../config/firebase.js";
import verifyFirebaseToken from "../middleware/auth.js";

const router = express.Router();
const db = admin.firestore();

// Valid mood options
const VALID_MOODS = ["Happy", "Neutral", "Tired", "Stressed"];

/**
 * 🔹 Create a wellness entry
 */
router.post("/", verifyFirebaseToken, async (req, res) => {
  const { steps, sleep, mood, notes } = req.body;
  const userId = req.user.uid;

  // Validation
  if (!steps || !sleep || !mood) {
    return res.status(400).json({ success: false, error: "Steps, sleep, and mood are required" });
  }

  if (isNaN(steps) || isNaN(sleep)) {
    return res.status(400).json({ success: false, error: "Steps and sleep must be numbers" });
  }

  if (!VALID_MOODS.includes(mood)) {
    return res.status(400).json({ success: false, error: "Invalid mood value" });
  }

  try {
    const entryRef = await db
      .collection("users")
      .doc(userId)
      .collection("wellnessEntries")
      .add({
        steps: parseInt(steps),
        sleep: parseFloat(sleep),
        mood,
        notes: notes || "",
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(201).json({ success: true, id: entryRef.id });
  } catch (err) {
    console.error("[ERROR] Create entry failed:", err.message);
    res.status(500).json({ success: false, error: "Failed to create entry" });
  }
});

/**
 * 🔹 Get all entries for the user
 */
router.get("/", verifyFirebaseToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("wellnessEntries")
      .orderBy("date", "desc")
      .get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to ISO string for frontend
      date: doc.data().date,
      createdAt: doc.data().createdAt?.toDate().toISOString()
    }));

    res.json({ success: true, entries });
  } catch (err) {
    console.error("[ERROR] Fetch entries failed:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch entries" });
  }
});

/**
 * 🔹 Get a single entry
 */
router.get("/:id", verifyFirebaseToken, async (req, res) => {
  const userId = req.user.uid;
  const { id } = req.params;

  try {
    const doc = await db
      .collection("users")
      .doc(userId)
      .collection("wellnessEntries")
      .doc(id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }

    res.json({ success: true, entry: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[ERROR] Fetch single entry failed:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch entry" });
  }
});

/**
 * 🔹 Update entry
 */
router.put("/:id", verifyFirebaseToken, async (req, res) => {
  const userId = req.user.uid;
  const { id } = req.params;
  const { steps, sleep, mood, notes } = req.body;

  // Validation
  if (mood && !VALID_MOODS.includes(mood)) {
    return res.status(400).json({ success: false, error: "Invalid mood value" });
  }

  try {
    const updateData = {};
    if (steps) updateData.steps = parseInt(steps);
    if (sleep) updateData.sleep = parseFloat(sleep);
    if (mood) updateData.mood = mood;
    if (notes !== undefined) updateData.notes = notes;
    
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db
      .collection("users")
      .doc(userId)
      .collection("wellnessEntries")
      .doc(id)
      .update(updateData);

    res.json({ success: true, message: "Entry updated successfully" });
  } catch (err) {
    console.error("[ERROR] Update entry failed:", err.message);
    res.status(500).json({ success: false, error: "Failed to update entry" });
  }
});

/**
 * 🔹 Delete entry
 */
router.delete("/:id", verifyFirebaseToken, async (req, res) => {
  const userId = req.user.uid;
  const { id } = req.params;

  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("wellnessEntries")
      .doc(id)
      .delete();

    res.json({ success: true, message: "Entry deleted successfully" });
  } catch (err) {
    console.error("[ERROR] Delete entry failed:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
});

export default router;