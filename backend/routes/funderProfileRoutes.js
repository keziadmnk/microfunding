const express = require("express");

const {
  getFunderProfile,
  updateFunderProfile,
} = require("../controller/funderProfileController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getFunderProfile);
router.put("/", authMiddleware, updateFunderProfile);

module.exports = router;
