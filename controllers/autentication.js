const User = require('../models/user')
const bcrypt = require('bcryptjs')


exports.isAuthenticated = (req, res, next) =>{
    // console.log(req.session.user_id)
    // console.log("This is the authentication section")
    if (req.session.user_id){
        return next()
    } else{
        res.redirect('/signin')
    }
}
exports.getSignUp = (req, res, next) =>{
    res.render('index', {csrfToken: req.csrfToken()})
}


exports.getSignIn = (req, res, next) =>{

    res.render('signin', {csrfToken: req.csrfToken()})
}


exports.postSignUp = (req, res, next) =>{

    // console.log(req.body);
    const username = req.body.username;
    const password = req.body.password;
    const user_id = "";
    let hashPassword;
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?_&])[A-Za-z\d@$!%*?_&]{8,}$/;

// Checks if the password is strong enough
    const isPasswordStrong = (password) => strongPasswordRegex.test(password);
    if(!isPasswordStrong(password)){
        // console.log("Password bad!")
        req.flash('error_msg', 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character');
        return res.redirect('/')
        
        // return res.status(400).send('Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character');
    }

    // Checks if the username already exists in the database
    User.findOne({where: {username: username}})
    .then(
        result => {
            // console.log(result)
            if (result) {
                req.flash('error_msg', 'User Already Exist!');
                return res.redirect('/')
                // return res.status(400).send("Username already exists")
            }

            // Hashing the password
            bcrypt.hash(password, 10) // Salt rounds to the power of 10
            .then((result) => {
                // console.log(result)
                hashPassword = result;

                // Create User 
              User.create({
                username: username,
                password: hashPassword
            }).then(
               (result) =>{
                //    console.log(result)
                   result = result.get({plain: true})
                    //    console.log("User Registered!")
                    req.flash('success_msg', 'Registration successful!')
                   return res.redirect('/signin')
   }).catch(err =>{console.log(err)});

            })
            .catch(err => {
                // console.log("Hashing error!")
                 req.flash('error_msg', 'Error!');
                 return res.redirect('/')
                // return res.send("Hashing error!")
            })
            
            

        }).catch(err => {
            req.flash('error_msg', 'Error with the Username!');
            console.log("There's an error with username")
            return res.redirect('/')
        })

    // console.log(hashPassword)



// res.redirect(301, '/dashboard')
    
//     if(!req.session.user_id){
//         req.session.user_id = {}
//     }
//     req.session.user_id = user_id
//     res.redirect('/dashboard', {isAuthenticated: true, user_id: user_id, username:username})
}


exports.postSignIn = async (req, res, next) =>{
    let {username, password} = req.body;

    
    // Extract User
    const findUser = async(username) =>{
        const user = await User.findOne({where:{username } })
        if (user) {
            // console.log(user)
            return user.get({plain: true})
            } else{

            console.log("No User")
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect('/')
                // res.send("Fill the boxes")
            }
        }

        // Compare Passwords
        const comparePassword = async(password, user) =>{
            // console.log(password)
            // console.log(user.password)
            // console.log(user)
            if (!user || !password) {
                console.log("Invalid User")
                req.flash('error_msg', 'Invalid username or password');
                return res.redirect('/')
            } else {
                const isMatch = await bcrypt.compare(password, user.password)
                if (isMatch){
                    console.log("Password matches!")
                } else{
                    console.log("Password doesn't match!")
                    req.flash('error_msg', 'Invalid username or password');
                    return res.redirect('/')
                }
                return isMatch
                
            }
        }

        
        // Add Session
        const addSession = async(user) =>{
                if(!req.session){
                    req.session = {}
                    console.log("Session has been created!")
                }
                // console.log(req.session)
                req.session.user_id = user.id;
                // return req.session.user_id;
                return
            }
        

        const user = await findUser(username)

        const isMatch = await comparePassword(password, user)

        if(isMatch){
            await addSession(user)
    }
    
        res.redirect('/dashboard')

                       
                    }
