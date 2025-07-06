const express = require("express");
const router = express.Router();
const inputController = require("../controllers/inputController");

router.get("/", inputController.renderInputPage); // 목록 렌더링
router.post("/submit", inputController.submitExpense); // 지출 추가
router.post("/delete-expense/:id", inputController.deleteExpense); // 지출 삭제

module.exports = router;
