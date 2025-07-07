// routes/result.js
const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");

router.get("/", resultController.renderResultPage);

module.exports = router;
