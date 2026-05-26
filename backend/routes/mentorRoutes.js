const express = require("express");

const {
  createMentorRequest,
  getMentorRequestDetail,
  getMentorProfile,
  listMentorRequests,
  listMentorsForUmkm,
  updateMentorProfile,
  updateMentorRequestStatus,
} = require("../controller/mentorController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", authMiddleware, getMentorProfile);
router.put("/profile", authMiddleware, updateMentorProfile);
router.get("/directory", authMiddleware, listMentorsForUmkm);
router.post("/:id/request", authMiddleware, createMentorRequest);
router.get("/requests", authMiddleware, listMentorRequests);
router.get("/requests/:id", authMiddleware, getMentorRequestDetail);
router.patch("/requests/:id/status", authMiddleware, updateMentorRequestStatus);

module.exports = router;
