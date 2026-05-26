const express = require("express");

const {
  businessAdvisor,
  umkmAiMatching,
  funderAiRecommendations,
} = require("../controller/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/business-advisor", authMiddleware, businessAdvisor);
router.post("/umkm-matching", authMiddleware, umkmAiMatching);
router.post("/funder-recommendations", authMiddleware, funderAiRecommendations);

module.exports = router;
