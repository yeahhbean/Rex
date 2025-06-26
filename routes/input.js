const express = require("express");
const router = express.Router();
const controller = require("../controllers/inputController");

// 지출 입력 화면
router.get("/", controller.renderInputForm);

// (추가: 저장 및 삭제 라우터도 여기에서 함께 관리하면 좋음)
router.post("/submit", controller.submitExpense);
router.post("/delete-expense/:id", controller.deleteExpense);

module.exports = router;
