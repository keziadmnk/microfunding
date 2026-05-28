const express = require("express");

const { getMentorProfile, listMentorProfiles } = require("../controller/mentoringController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listMentorProfiles);
router.get("/:id", getMentorProfile);

module.exports = router;
