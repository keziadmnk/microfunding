const express = require("express");

const {
  createFunding,
  getFundingUmkm,
  listFundingHistory,
  listRecommendedUmkms,
} = require("../controller/fundingController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/umkms", authMiddleware, listRecommendedUmkms);
router.get("/history", authMiddleware, listFundingHistory);
router.get("/umkms/:id", authMiddleware, getFundingUmkm);
router.post("/umkms/:id/fund", authMiddleware, createFunding);

module.exports = router;
