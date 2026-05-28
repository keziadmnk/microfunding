const express = require("express");

const {
  createFunding,
  createFundingRequestByUmkm,
  completeFundingRequest,
  getFundingUmkm,
  getFundingRequest,
  listFundingHistory,
  listFundersForUmkm,
  listUmkmFundingHistory,
  listRecommendedUmkms,
} = require("../controller/fundingController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/umkms", authMiddleware, listRecommendedUmkms);
router.get("/funders", authMiddleware, listFundersForUmkm);
router.get("/history", authMiddleware, listFundingHistory);
router.get("/umkm/history", authMiddleware, listUmkmFundingHistory);
router.get("/requests/:id", authMiddleware, getFundingRequest);
router.patch("/requests/:id/complete", authMiddleware, completeFundingRequest);
router.get("/umkms/:id", authMiddleware, getFundingUmkm);
router.post("/umkms/:id/fund", authMiddleware, createFunding);
router.post("/funders/:id/request", authMiddleware, createFundingRequestByUmkm);

module.exports = router;
