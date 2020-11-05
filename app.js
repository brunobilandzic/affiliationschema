require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const User = require(__dirname + "/models/user.js");
const Post = require(__dirname + "/models/post.js");
var sortPosts = require(__dirname + "/sorting.js");
const nodemailer = require('nodemailer');
const session = require("express-session");
const passport = require("passport");
const crypto = require("crypto");
const ld = require("lodash");
const app = express();


app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.text({
  type: "text/plain"
}));
app.use(session({
  secret: "Jeremy is black and white.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Routes

app.get("/", (req, res) => {
  if(typeof(req.user)!="undefined" && req.isAuthenticated()){
    return res.redirect("/all-posts");
  }
  Post.find({}, (err, posts) => {
    if (err) {
      return;
    } else {
      return res.render("home", {
        auth: req.isAuthenticated(),
        count: posts.length,
        user: req.user
      });
    }
  });
});

app.get("/all-posts", (req, res) => {
  if(req.isAuthenticated()){

  }
  Post.find({}, (err, posts) => {
    if (err) {
      return;
    } else {

      return res.render("posts", {
        title: "All Posts",
        auth: req.isAuthenticated(),
        user: req.user,
        posts: typeof(req.query.mostpopular) == "undefined"  ? sortPosts(posts, "compareByDate") : sortPosts(posts, "compareByLikes")
      });
    }
  });
});
app.get("/user-posts", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/log-in");
  }
  Post.find({author: req.user.username}, (err, posts) => {
    if (err) {
      return;
    } else {
      return res.render("posts", {
        title: "Your Posts",
        auth: req.isAuthenticated(),
        user: req.user,
        posts: typeof(req.query.mostpopular) == "undefined"  ? sortPosts(posts, "compareByDate") : sortPosts(posts, "compareByLikes")
      });
    }
  });
});
app.get("/posts/:post_id", (req, res) => {
  Post.find({_id: req.params.post_id}, (err, posts) => {
    if (err) {
      return;
    } else {
      return res.render("posts", {
        auth: req.isAuthenticated(),
        user: req.user,
        posts: typeof(req.query.mostpopular) == "undefined"  ? sortPosts(posts, "compareByDate") : sortPosts(posts, "compareByLikes")
      });
    }
  });
})
app.get("/users/:username", (req, res) => {
  Post.find({
    author: req.params.username
  }, (err, posts) => {
    return res.render("posts", {
      title: "@" + req.params.username,
      auth: req.isAuthenticated(),
      user: req.user,
      posts: typeof(req.query.mostpopular) == "undefined"  ? sortPosts(posts, "compareByDate") : sortPosts(posts, "compareByLikes")
    })
  });
});
app.get("/categories/:category", (req, res) => {
  Post.find({
    category: req.params.category
  }, (err, posts) => {
    return res.render("posts", {
      title:  ld.capitalize(ld.lowerCase(req.params.category)),
      auth: req.isAuthenticated(),
      user: req.user,
      posts: typeof(req.query.mostpopular) == "undefined"  ? sortPosts(posts, "compareByDate") : sortPosts(posts, "compareByLikes")
    })
  });
});
app.get("/compose", (req, res) => {
  if (req.isAuthenticated() || true) {
    return res.render("compose", {
      auth: req.isAuthenticated(),
      user: req.user
    });
  } else {
    res.redirect("/log-in");
  }

});

app.post("/post", (req, res) => {
  if (req.isAuthenticated() && req.user.verified) {
    const newPost = new Post({

      title: req.body.newPostTitle,
      author: req.user.username,
      category: req.body.category,
      post: req.body.newPost,
      likes: [],
      comments: [],
      dateAdded: Date.now()
    });
    newPost.save();
    return res.redirect("/all-posts");
  } else {
    if(!req.isAuthenticated())
      return res.render("log-in",{
        auth: req.isAuthenticated(),
        errorList: ["Please sing up or log in in order to publish your post."]
      });
    else
      return res.render("verify",{
        auth: req.isAuthenticated(),
        errorList: ["Please verify your e-mail in order to publish your post."],
        user: req.user
      });
  }
});

app.post("/like/:post_id", (req, res) => {
  Post.findOneAndUpdate({
    _id: req.params.post_id
  },{
    $push: {
      likes: req.user.username}
    }, (err, post) => {
    if (post){
      User.findOneAndUpdate(
        {username: post.author},
          { $push:
            { notifications: {type:"lik", post_id: post._id, author: req.user.username, postName: post.title, seen: false, dateAdded: new Date()}}
          },
          (err, user) => {
        if(user){
          user.save();
        }

      })
      let data = {
        username: req.user.username,
        count: post.likes.length + 1
      }


      return res.send(JSON.stringify(data));
    }

  });
});

app.post("/comment/:post_id", (req, res) => {
  Post.findOneAndUpdate({
    _id: req.params.post_id
  }, {$push:
    {comments: {author: req.user.username, text: req.body, dateAdded: new Date()}}
  },
  (err, post)=>{
    if(err) console.log(err);
    User.findOneAndUpdate({username: post.author},
      {$push:
        {notifications: {type:"comment", post_id: post._id, author: req.user.username,postName: post.title,  seen: false, dateAdded: new Date()}}
      }, (err, user) => {
      if(user)
        user.save();
    });
    if(post)
      post.save();
    return res.send({
      username: req.user.username
    });
  });
});
app.post("/notificationseen", (req, res)=>{
  if(typeof(req.user) == "undefined"){
    return;
  }
  User.findOne({username: req.user.username}, (err, user) => {
    if(err){
      console.log(err);
      return;
    }
    if (user) {

      user.notifications.forEach((not, i) => {
        let newNot = not;
        newNot.seen = true;
        user.notifications.set(i, newNot);
      })
      user.save();
    }
  });
})


app.get("/sing-up", (req, res) => {
  res.render("sing-up", {
    auth: req.isAuthenticated()
  });
});

app.get("/c", (req, res) => {
  let str = "false";
  if (req.isAuthenticated()) {
    if(req.user.verified)
      str = "true";
    else
      str="notVerified"
  } else {
    str = "notLogedIn"
  }
  return res.send(str);
});
app.get("/about", (req, res) => {
  res.render("about" ,{
    auth: req.isAuthenticated(),
    user: req.user
  });
});


app.post("/sing-up", (req, res) => {
  const errorsList = [];
  const suData = req.body;
  if(suData.username != suData.username.split("").filter(x => x.match(/\w/i)).join("")){
    errorsList.push("Username can only contain a-z, A-Z, 0-9 and _.");
  }
  if(suData.username.length<5 || suData.username.length > 20){
    errorsList.push("Username must contain between 5 and 20 cahracters.");
  }
  if (suData.password != suData.password2) {
    errorsList.push("Passwords have to match");
  }
  if (suData.password.length < 6){
    errorsList.push("Password has to be at least 6 characters long.");
  }
  User.findOne({email: suData.email}, (err, user) => {
    if(user){
      errorsList.push("E-mail address already in use.");
    }
  });
  if(errorsList.length != 0){
    return res.render("sing-up", {
      auth: req.isAuthenticated(),
      errorList: errorsList
    });
  }
  User.register({
    username: suData.username,
    email: suData.email,
    auth: crypto.createHmac("sha256", suData.username + suData.password).update("salty").digest("hex")
  }, suData.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/sing-up");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/verify");
      });
    }

  });
});
app.get("/verify", (req, res) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: proccess.env.asEmail,
      pass: proccess.env.asEmailPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  User.findOne({_id: req.user._id}, (err, user) => {
    if(err){
      console.log(err);
      return;
    }
    else {
      const hash = req.user.auth;
      const url = req.protocol + "://" + req.get("host") + req.url + "/" + req.user.username + "/" + hash;
      const mailOptions = {
        from: proccess.env.asEmail,
        to: user.email,
        subject: 'Verify your e-mail!',
        html: `<h1>Hey</h1>
              <p>Please Verify your E-Mail by clicking <a href="`+ url + `">Here</a>.</p>`
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if(err)
          console.log(err);
      });
    }
  });
  return res.render("verify",  {
    auth: req.isAuthenticated(),
    user: req.user
  });
});
app.get("/resetpass", (req, res) => {
  return res.render("pass-reset", {
    auth: req.isAuthenticated(),
    user: req.user
  });
});
app.post("/resetpass", (req, res) => {
  User.findOne({username: req.body.username}, (err, user)=>{
    if(err){
      console.log(err);
      return;
    }
    if(user){
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: proccess.env.asEmail,
          pass: proccess.env.asEmailPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      const hash = user.auth;
      const url = req.protocol + "://" + req.get("host") + req.url + "/" + user.username + "/" + hash;
      const mailOptions = {
        from: 'affiliationschema@gmail.com',
        to: user.email,
        subject: 'Verify your e-mail!',
        html: `<h1>Password Reset</h1>
              <p>Reset your password by clicking <a href="`+ url + `">Here</a>.</p>`
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if(err)
          console.log(err);
      });
      return res.render("pass-reset-demand", {
        auth: req.isAuthenticated(),
        user: user
      });
    }
  });
});
app.get("/resetpass/:username/:hash", (req, res) => {
  const errorList = [];
  User.findOne({username:req.params.username}, (err, user) => {
    if (err)
      console.log(err);
    if(user.auth != req.params.hash){
      errorList.push("Something went wrong, please try reseting your password again.");
    }
    if(errorList.length!=0){
      return res.render("pass-reset", {
        auth: req.isAuthenticated(),
        errorList: errorList
      });
    }
    return res.render("new-pass-prompt", {
      npUsername: req.params.username,
      auth: req.isAuthenticated(),
    })
  })
});
app.post("/newpass/:username", (req, res) => {
  let suData = req.body;
  let errorsList= [];
  if (suData.password != suData.password1) {
    errorsList.push("Passwords have to match");
  }
  if (suData.password.length < 6){
    errorsList.push("Password has to be at least 6 characters long.");
  }
  if(errorsList.length != 0){
    return res.render("new-pass-prompt", {
      auth: req.isAuthenticated(),
      npUsername: req.params.username,
      errorList: errorsList
    });
  }
  User.findOne({username: req.params.username}, (err, user)=>{
    if(err)
      return console.log(err);
    else{
      if(user){
        user.setPassword(suData.password, (err, user)=> {
          if(err)
            return console.log(err);
          else{
            user.auth = crypto.createHmac("sha256", user.username + suData.password).update("salty").digest("hex")
            user.save();
            res.render("log-in",{
              auth: req.isAuthenticated(),
              user: req.user
            })
          }
        });
      }
    }
  });
});
app.get("/log-in", (req, res) => {
  res.render("log-in", {
    auth: req.isAuthenticated()
  });
});
app.get("/log-out", (req, res) => {
  req.logout();
  res.redirect("/");
});
app.post("/log-in", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  const errorList = [];
  const user = new User({
    username: username,
    password: password
  });
  User.findOne({username: username}, (err, u) =>{
    if(!u){
      errorList.push("There is no account with username " +  username);
      return res.render("log-in",{
        auth: req.isAuthenticated(),
        errorList: errorList
      });
    }
    if(u.auth != crypto.createHmac("sha256", username + password).update("salty").digest("hex")){
      errorList.push("Wrong password, please try again.");
      return res.render("log-in",{
        auth: req.isAuthenticated(),
        errorList: errorList
      });
    }
    else {
      req.login(user, (err) => {
        if(err){
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, ()=>{
            res.redirect("/");
          });
        }
      });
    }
  });

});
app.get("/verify/:username/:hash", (req, res) => {
  const errorList = [];
  User.findOne({username:req.params.username}, (err, user) => {
    if (err)
      console.log(err);
    if(user.auth != req.params.hash){
      User.deleteOne({_id: user._id});
      errorList.push("Verification went wrong, please sing up again in order to repeat it.");
    }
    if(errorList.length!=0){
      return res.render("sing-up", {
        auth: req.isAuthenticated(),
        errorList: errorList
      });
    }
    user.verified = true;
    user.save();
    res.redirect("/all-posts");
  })
})
app.post("/delete/:post_id", (req, res) => {
  if(!req.isAuthenticated()){
    return;
  }
  Post.deleteOne({_id: req.params.post_id}, (err) => {
    if(err){
      console.log(err);
    }
  });
});
app.post("/search", (req, res) => {
  Post.find(
    {$or:[
      {author: {$regex: ".*" + req.body.query + ".*" , $options : 'i'}},
      {title: {$regex: ".*" + req.body.query + ".*", $options : 'i'}}
    ]
    }, (err, posts) => {
      if (err) {
        console.log(err);
      } else {
        res.render("posts", {
          auth: req.isAuthenticated(),
          user: req.user,
          posts: typeof(req.query.mostpopular) == "undefined"  ? sortPosts(posts, "compareByDate") : sortPosts(posts, "compareByLikes")
        });
      }
    })
})
app.listen(process.env.PORT || 3000, () => {

})
