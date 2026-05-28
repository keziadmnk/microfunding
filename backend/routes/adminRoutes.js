const express = require("express");

const {
  getAllUmkms,
  getPendingUmkms,
  approveUmkm,
  declineUmkm,
  getAllMentors,
  approveMentor,
  declineMentor,
  getAllFunders,
} = require("../controller/adminController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ── UMKM ────────────────────────────────────────
router.get("/umkms", authMiddleware, getAllUmkms);
router.get("/umkms/pending", authMiddleware, getPendingUmkms);
router.put("/umkms/:id/approve", authMiddleware, approveUmkm);
router.put("/umkms/:id/decline", authMiddleware, declineUmkm);

// ── Mentor ───────────────────────────────────────
router.get("/mentors", authMiddleware, getAllMentors);
router.put("/mentors/:id/approve", authMiddleware, approveMentor);
router.put("/mentors/:id/decline", authMiddleware, declineMentor);

// ── Funder ───────────────────────────────────────
router.get("/funders", authMiddleware, getAllFunders);

module.exports = router;
