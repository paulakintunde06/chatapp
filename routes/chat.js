const express = require("express")
const app = express()
const router = express.Router()
const chatController = require("../controllers/chat")
const db = require('../util/database');
const isAuthenticated = require("../controllers/autentication").isAuthenticated

// router.get('/', chatController.get)
router.get('/dashboard', isAuthenticated, chatController.getDashboard)
router.get('/chat/:id',isAuthenticated, chatController.getChat)
// router.post('/chat', isAuthenticated, chatController.postChat)
router.get('/forum', isAuthenticated, chatController.getForum)
// router.post('/forum', isAuthenticated, chatController.postForum)
router.get('/logout', chatController.getLogout)

module.exports = router