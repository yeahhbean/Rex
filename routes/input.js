const express = require("express");
const router = express.Router();
const inputController = require("../controllers/inputController");

//JWT 인증 미들웨어 import
const { verifyToken } = require("./auth"); // 또는 middlewares/auth 등 위치에 맞게 수정

//인증된 사용자만 접근 가능하도록 보호
router.get("/", verifyToken, inputController.renderInputPage); // 목록 렌더링
router.post("/submit", verifyToken, inputController.submitExpense); // 지출 추가
router.post("/delete-expense/:id", verifyToken, inputController.deleteExpense); // 지출 삭제

module.exports = router;
