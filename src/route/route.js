const express = require('express');
const router = express.Router();

const  { urlCreate,getUrl}= require("../Controllers/urlController");

router.post("/url/shorten",urlCreate)
router.get("/:urlCode",getUrl)

module.exports = router
