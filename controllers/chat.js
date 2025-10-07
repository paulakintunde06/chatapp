const {Sequelize, Op} = require('sequelize');
const db = require('../util/database');
const User = require('../models/user');
const Chat = require('../models/chat');
const Forum = require('../models/forum');
// let chats = [];
// let users = [];
// let forum = [];

// DASHBOARD
exports.getDashboard = (req, res, next) =>{
    // console.log("I'm in the dashboard now!")
    // console.log(req.session.user_id)
    req.session.csrfToken = req.csrfToken()
    // console.log(req.session.csrfToken)
    let users = []
    let myUserId = req.session.user_id;
   async function getOtherUsers(){
       users = await User.findAll(
        {
            where:{
                id: {
                    [Sequelize.Op.not]: myUserId
                }
            }
        }
       );
    //    console.log(users[1]['dataValues'])
       users = users.map(user => user.toJSON());
       return users;
    }
    getOtherUsers().then(result => {
        users = result
        // console.log(users)
        res.render('dashboard', {users: users, user_id: req.session.user_id, usernames: users.username, csrfToken: req.session.csrfToken });
    })
    // console.log(users)
    // console.log(users)
}

// CHAT
exports.getChat = (req, res, next) =>{
    const receiver_id = Number(req.params.id)
    const sender_id = req.session.user_id;
    const csrfToken = req.session.csrfToken
    let username;
    console.log(sender_id, receiver_id);
        Chat.findAll(
            {
            where:{
                [Op.or]:[
                    {sender_id: sender_id, receiver_id: receiver_id},
                    {sender_id: receiver_id, receiver_id: sender_id}
                ]
            },
            order:[['createdAt', 'ASC']]
        }
        ).then((result) =>{
            result = result.map(chat => chat.get({ plain: true }));
            // console.log(1)
            // console.log("Hi")
            // console.log(result)
            res.render('chat', {sender_id: sender_id, receiver_id: receiver_id, messages:result, csrfToken:req.session.csrfToken, username:username}
            );

        }).catch((err) =>{
            console.log("Error name:", err.name)
            console.log("Error message:", err.message)
            console.log("Full error:", err)
        })
   

}
exports.postChat = (req, res, next) =>{
    const message = req.body.message;
    const sender_id = req.session.user_id
    const receiver_id = req.body.receiver_id
    req.session.csrfToken = req.csrfToken()
    // console.log(receiver_id)
    // console.log(message)
    // console.log(sender_id)
         Chat.create({
            message: message,
            sender_id: Number(sender_id),
            receiver_id: Number(receiver_id)
        })
        .then(
            (result) =>{
                result = result.get({plain:true})
                // console.log(result)
                res.redirect(`/chat/${receiver_id}`)
            }).catch(err => {
            console.log("Error name:", err.name)
            console.log("Error message:", err.message)
            console.log("Full error:", err)
            });

}

// FORUM
exports.getForum = (req, res, next) =>{
    req.session.csrfToken = req.csrfToken();
    const sender_id = req.session.user_id;
    console.log(sender_id)
    Forum.findAll()
    .then(forumChat =>{
        // forumChat.map(forum => {console.log(forum)})
        // console.log(sender_id)
        let newforum = forumChat.map(forum => forum.toJSON())
        // console.log(newforum)
        // const isForum = true
        res.render('forum', {sender_id: sender_id, forum: newforum, csrfToken: req.session.csrfToken, isForum: true})
    } 
    ).catch(err => {
        console.log("Error name:", err.name)
        console.log("Error message:", err.message)
        console.log("Full error:", err)
    });
}
exports.postForum = (req, res, next) =>{
    let message = req.body.message;
    let sender_id = req.body.sender_id;
    let receiver_id = req.body.receiver_id;
    // console.log(sender_id)
    // console.log(message)
    // console.log(receiver_id)

    
        const forumChat = Forum.create({
            message: message,
            sender_id: sender_id
        })
        .then(result =>{
            // console.log(result);
            res.redirect('/forum')
        }).catch(err => {
            console.log("Error name:", err.name)
            console.log("Error message:", err.message)
            console.log("Full error:", err)
        })
        // console.log(forumChat)
   
}

exports.getLogout = (req, res, next) =>{
    // console.log(res.locals.csrfToken)
    req.session.destroy((err) =>{
        if(err){
            console.log(err)
            return res.status(500).send("Logout failed")
        }
        res.redirect('/signin')
    })
}