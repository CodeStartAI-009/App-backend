const express = require("express");
const { signup, login } = require("../controllers/authController");
const cors = require("cors");

const router = express.Router();

router.post("/signup", cors(), signup);
router.post("/login", cors(), login);

module.exports = router;
