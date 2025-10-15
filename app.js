require('dotenv').config()
const express = require("express")
const app = express();
const bodyParser = require("body-parser")
const path = require('path'); 
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const sequelize = require('./util/database');
// npm install express-session connect-session-sequelize
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const bcrypt = require("bcryptjs");
const http = require('http');
const {Server} = require('socket.io');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');

const server = http.createServer(app)

const isProduction = process.env.NODE_ENV === 'production';
console.log(isProduction)
const productionUrl = "https://chatapp-mw90.onrender.com"


// app.get('/clear_sessions', async (req, res) => {
//      try {
//           await sequelize.query('DELETE FROM sessions');
//           console.log("All sessions cleared");
//           res.send("Sessions cleared. Please login again");
//      } catch (error) {
//           console.log("Error clearing sessions:", error);
//           res.send("Error clearing sessions: " + error.message)
//      }
// })

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                // ...(isProduction ? [] : ["'unsafe-inline'", "http://localhost:3000"])
                "'unsafe-inline'",
                "'unsafe-eval'",
                "http://localhost:3000", // Development
                "https://chatapp-mw90.onrender.com" // Production
            ],
            connectSrc: [
                "'self'",
                "ws:",
                "wss:",
                ...(isProduction ? [productionUrl, `wss://${new URL(productionUrl).hostname}`] : ["http://localhost:3000", "ws://localhost:3000"]
                )
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(compression())
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize cookie parser
app.use(cookieParser())

// // Enable CSRF protection
app.use(csurf({
    cookie: true,
    ignoreMethods: ['POST', 'GET', 'HEAD', 'OPTIONS']
}))

// // Middleware to set CSRF token for views or responses
app.use((req, res, next) => {
    res.cookie('XSRF-TOKEN', req.csrfToken()); // Add token as cookie
    // console.log(req.csrfToken())
    next();
})


app.set('view engine', 'ejs');
app.set('views', 'views');

const sessionStore = new SequelizeStore({
    db: sequelize,
})

// Session Store
// const sessionStore = new SequelizeStore({
//     db: sequelize,
// });
const sessionMiddleware =
session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "myTopSecret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: process.env.NODE_ENV === "production" ? true:false, // will set to true in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax'
    },
    rolling: true,
    unset: 'destroy'// properly destroy session on logout
})
const User = require('./models/user');
const Chat = require('./models/chat');
const Forum = require('./models/forum');

const authenticationRoutes = require('./routes/authentication');
const chatRoutes = require('./routes/chat');

const errorController = require("./controllers/error")
const authenticationController = require("./controllers/autentication")
const chatController = require("./controllers/chat");
const { contentSecurityPolicy } = require("helmet");



app.use(
   sessionMiddleware
    );
    
    app.use(flash())
    
    // Sync the session store
sessionStore.sync().then(() => {
    console.log("sessions table created")
}).catch(err => console.log("Error sequelize"));

app.use((req, res, next) => {
    const userAgent = req.get('User-Agent');
    const isFirefox = userAgent.includes('Firefox');
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');

    if (isFirefox) {
        console.log("This is firefox")
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Vary': 'User-Agent'  // Important for firefox
        })
        next();
    }
})

app.use(authenticationRoutes);
app.use(chatRoutes);
app.use(errorController.get404);


// A user can send many messages
User.hasMany(Chat, {foreignKey: 'sender_id', as:'sentMessages'});

// A user can receive many messages
User.hasMany(Chat, {foreignKey: 'receiver_id', as: 'receivedMessages'});

// A user can send many messages to the forum
User.hasMany(Forum, {foreignKey: 'sender_id', as: 'sentForumMessages'});

// A chat belongs to a sender
Chat.belongsTo(User, {foreignKey: 'sender_id', as: 'sender'})

// A chat belongs to a receiver
Chat.belongsTo(User,{ foreignKey:'receiver_id', as: 'receiver',constraints: true, onDelete: 'CASCADE' })

// A forum_message belongs to a sender
Forum.belongsTo(User,{ foreignKey:'sender_id', as: 'forumSender',constraints: true, onDelete: 'CASCADE' })

sequelize.authenticate().then(()=>console.log('Connection established to:', sequelize.getDatabaseName())).catch(err=> console.error('Unable to connect: ', err))




sequelize
    .sync(
    // { alter: true }
    )
    .then(result => {
        console.log("All models are synchronized successfully");
        
        // console.log("Tables created");
}).catch(err =>{
    // console.log('Tables not created');
    console.log(err);
})

console.log(process.env.NODE_ENV)

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            callback(null, true)
        },
        methods: ['GET', 'POST']
    }
});
// const socket = io()
// console.log("SERVER")
// io.on('connection', (socket) => {
//     console.log('ROOT')
//     socket.on('disconnect', () => {
//         console.log("ROOT disconnect")
//     })
// })
const chatNamespace = io.of('/chat')
const forumNamespace = io.of('/forum')


// Chat namespaces
const userSockets = new Map();
chatNamespace.on('connection', (socket) => {
    console.log("Connected to chat namespace")
    socket.on("chatMessage", async (data) => {
        console.log(data)
        await User.findByPk(Number(data.sender_id)).then(user => {
            console.log(user)
            Chat.create({
                message: data.message,
                sender_id: data.sender_id,
                receiver_id: data.receiver_id,
                username: user.username
            })
                .then(result => {
                    chatNamespace.emit("chatMessage",
                        {
                            message: data.message,
                            sender_id: data.sender_id,
                            receiver_id: data.reeciver_id,
                            username: user.username
                        }
                    );
                    // res.redirect('/forum')
                }).catch(err => {
                    console.log(err)
                })
                
        })
        // chatNamespace.emit('chatMessage', data);
                    
    })
    socket.on('userIdentified', (userId) => {
        userSockets.set(userId, socket.id);
        console.log(`User ${userId} connected with ${socket.id}`);
    });

    const getSocketId = (userId) => {
        return userSockets.get(userId);
    };

    // Track read messages
    socket.on('markMessagesRead', (data) => {
        const { sender_id, receiver_id } = data;
        console.log(`Marking messages as read:`, data);

        // Update messages as read in database
        Chat.update(
            { read: true },
            {
                where: {
                    sender_id: sender_id,
                    receiver_id: receiver_id,
                    read: false
                }
            }
        );


        // Notify sender that messages were read
        const senderSocketId = userSockets.get(sender_id.toString());
        if (senderSocketId) {
            chatNamespace.to(getSocketId(sender_id)).emit('messagesRead', {
                reader_id: receiver_id,
                timestamp: new Date()
            });
            console.log(`Notifies sender ${sender_id} that messages were read by ${receiver_id}`);
        } else {
            console.log(`Sender ${sender_id} is not currently connected`)
        }

    })
    
        // Handle user disconnect
        socket.on('disconnect', () => {
            for (let [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    console.log(`Removed under ${userId} from tracking`)
                    break;
                }
            }
            console.log(`User disconnected from chat  namespace: `, socket.id)
        })
})

// Forum namespace
forumNamespace.on('connection', (socket) =>{
    console.log("Connected to forum namesapce");
    socket.on("forumMessage", async(data) =>{
        if (data.isForum === "true") {
            await User.findByPk(data.sender_id).then(user => {
                Forum.create({
                    message: data.message,
                    sender_id: data.sender_id,
                    username: user.username
                })
                .then(result =>{
                    forumNamespace.emit("forumMessage",
                        {
                    message: data.message,
                    sender_id: data.sender_id,
                    username: user.username
                }
                    );
                    // res.redirect('/forum')
                }).catch(err => {
                    console.log(err)
                })
                
            })

                    }})
                    // Handle user disconnect
                socket.on('disconnect', () =>{
                    console.log('User disconnected:', )
                })
})

server.listen(3000, () => {
    console.log("Server running on localhost")
    console.log("Socket.IO ready for connection")
})

