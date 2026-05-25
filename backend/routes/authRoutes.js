const express = require("express");

const { login, me, register } = require("../controller/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", authMiddleware, me);

module.exports = router;
