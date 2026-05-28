const express = require("express");

const {
  createComment,
  createPost,
  listPosts,
  toggleLike,
  updateUserLocation,
} = require("../controller/forumController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/posts", authMiddleware, listPosts);
router.post("/posts", authMiddleware, createPost);
router.post("/posts/:id/like", authMiddleware, toggleLike);
router.post("/posts/:id/comments", authMiddleware, createComment);
router.put("/location", authMiddleware, updateUserLocation);

module.exports = router;
