const express = require("express");

const {
  acceptMentoringRequest,
  cancelMentoringRequest,
  cancelSession,
  cancelWorkspace,
  completeSession,
  completeWorkspace,
  createBusinessProgress,
  createMentorNote,
  createMentoringRequest,
  createReview,
  createSession,
  createTask,
  createWorkspaceMessage,
  uploadWorkspaceFile,
  cancelTaskSubmission,
  deleteMentorNote,
  deleteTask,
  getMentorProfile,
  getWorkspace,
  getWorkspaceItems,
  listIncomingMentoringRequests,
  listMentorProfiles,
  listMyMentoringRequests,
  listRequestsByMentor,
  listRequestsByUmkm,
  listSessionsByWorkspace,
  listProgressByWorkspace,
  listNotesByWorkspace,
  listWorkspaceMessages,
  listWorkspaceFiles,
  listTasksByUmkm,
  listTasksByWorkspace,
  listMyWorkspaces,
  listWorkspacesByMentor,
  listWorkspacesByUmkm,
  rejectMentoringRequest,
  respondMentoringRequest,
  updateProgressRecommendation,
  updateMentorNote,
  updateSession,
  updateTask,
  updateTaskStatus,
  submitTask,
  updateWorkspaceStatus,
  upsertMyMentorProfile,
} = require("../controller/mentoringController");
const authMiddleware = require("../middleware/authMiddleware");
const { mentoringMaterialUpload, mentoringTaskUpload } = require("../middleware/mentoringUpload");

const router = express.Router();

router.use(authMiddleware);

router.get("/profiles", listMentorProfiles);
router.get("/profiles/:id", getMentorProfile);
router.put("/profiles/me", upsertMyMentorProfile);

router.post("/requests", createMentoringRequest);
router.get("/requests/my", listMyMentoringRequests);
router.get("/requests/incoming", listIncomingMentoringRequests);
router.get("/requests/umkm/:umkmUserId", listRequestsByUmkm);
router.get("/requests/mentor/:mentorId", listRequestsByMentor);
router.patch("/requests/:requestId/accept", acceptMentoringRequest);
router.patch("/requests/:requestId/reject", rejectMentoringRequest);
router.patch("/requests/:requestId/cancel", cancelMentoringRequest);
router.patch("/requests/:id/respond", respondMentoringRequest);
router.patch("/requests/:id/cancel", cancelMentoringRequest);

router.get("/workspaces", listMyWorkspaces);
router.get("/workspaces/umkm/:umkmUserId", listWorkspacesByUmkm);
router.get("/workspaces/mentor/:mentorId", listWorkspacesByMentor);
router.get("/workspaces/:workspaceId/items", getWorkspaceItems);
router.patch("/workspaces/:workspaceId/status", updateWorkspaceStatus);
router.patch("/workspaces/:workspaceId/complete", completeWorkspace);
router.patch("/workspaces/:workspaceId/cancel", cancelWorkspace);
router.get("/workspaces/:workspaceId", getWorkspace);

router.get("/workspaces/:workspaceId/sessions", listSessionsByWorkspace);
router.post("/workspaces/:workspaceId/sessions", createSession);
router.patch("/sessions/:sessionId/complete", completeSession);
router.patch("/sessions/:sessionId/cancel", cancelSession);
router.patch("/sessions/:sessionId", updateSession);

router.get("/workspaces/:workspaceId/tasks", listTasksByWorkspace);
router.post("/workspaces/:workspaceId/tasks", createTask);
router.get("/tasks/umkm/:umkmUserId", listTasksByUmkm);
router.patch("/tasks/:taskId/status", updateTaskStatus);
router.post("/tasks/:taskId/submit", mentoringTaskUpload.single("file"), submitTask);
router.patch("/tasks/:taskId/submission/cancel", cancelTaskSubmission);
router.patch("/tasks/:taskId", updateTask);
router.delete("/tasks/:taskId", deleteTask);

router.get("/workspaces/:workspaceId/progress", listProgressByWorkspace);
router.post("/workspaces/:workspaceId/progress", createBusinessProgress);
router.patch("/progress/:progressId/recommendation", updateProgressRecommendation);

router.get("/workspaces/:workspaceId/notes", listNotesByWorkspace);
router.post("/workspaces/:workspaceId/notes", createMentorNote);
router.patch("/notes/:noteId", updateMentorNote);
router.delete("/notes/:noteId", deleteMentorNote);
router.post("/workspaces/:workspaceId/review", createReview);
router.get("/workspaces/:workspaceId/messages", listWorkspaceMessages);
router.post("/workspaces/:workspaceId/messages", createWorkspaceMessage);
router.get("/workspaces/:workspaceId/files", listWorkspaceFiles);
router.post("/workspaces/:workspaceId/files", mentoringMaterialUpload.single("file"), uploadWorkspaceFile);

module.exports = router;
