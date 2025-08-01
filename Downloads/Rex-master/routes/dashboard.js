// routes/dashboard.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

//verifyToken 미들웨어 정확히 가져오기
const { verifyToken } = require("./auth");

//미들웨어 적용한 단 하나의 라우팅만 유지
router.get("/", verifyToken, dashboardController.renderDashboard);

module.exports = router;
