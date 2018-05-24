var express = require('express');
var linebot = require('linebot');
var firebaseAdminDb = require('./connection/firebase_admin');
var usersRef = firebaseAdminDb.ref('/users');
var subscribesRef = firebaseAdminDb.ref('/subscribes');
var feed = require('./feed');
var path = require('path');
require('dotenv').config()
var usersRouter = require('./routes/users');
var app = express();
var cron = require('node-cron');

/* Set router */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use('/users', usersRouter);
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

function crawler() {
  console.log("-----------------------");
  feed.fetchDramas((dramas) => {
    let tempSubscribe = [];
    subscribesRef.once('value')
      .then((snapshot) => {
        snapshot.forEach((params) => {
          let temp = params.val();
          tempSubscribe.push({
            id: params.key,
            title: temp.title,
            subscribers: temp.subscribers,
            post_time: temp.post_time
          });
        });
        var test = [];

        for (let index = 0; index < dramas.length; index++) {
          const element = dramas[index];
          for (let index2 = 0; index2 < tempSubscribe.length; index2++) {
            const element2 = tempSubscribe[index2];

            if (element.title.indexOf(element2.title) !== -1 && (element.post_time !== element2.post_time)) {
              console.log(element.title, ' ', element.post_time, ' ', element2.post_time);
              element2.link = element.link;
              element2.title = element.title;
              test.push(element2);
              subscribesRef.child(element2.id).update({
                  post_time: element.post_time
                })
                .then((value) => {

                });
              break;
            }
          }
        }
        //console.log(test);
        test.forEach((drama) => {
          var users = [];
          const promise = new Promise(function (resolve, reject) {
            for (let index = 0; index < drama.subscribers.length; index++) {
              const user = drama.subscribers[index];
              usersRef.child(user).once('value')
                .then((snapshot) => {
                  console.log(snapshot.val().userId);
                  users.push(snapshot.val().userId);
                  if (index === drama.subscribers.length - 1) {
                    resolve();
                  }
                });
            }
          });

          promise.then((value) => {
            var replys = [];
            replys.push({
              type: 'text',
              text: `新片到了 【${drama.title}】 ${drama.link}`
            });

            console.log("resplys ", replys);
            console.log("users ", users);
            var temp = [];
            for (let index = 1; index <= replys.length; index++) {
              temp.push(replys[index - 1]);
              if (index % 4 === 0 || index === replys.length) {
                bot.push(users, temp);
                temp = [];
              }
            }
          });
        });
      });
  });
}
app.get('/test', function (req, res, next) {
  crawler();
  next();
});

app.get('/subscribe', function (req, res, next) {
  res.render('subscribe');
});

app.post('/subscribe', function (req, res) {
  const subscribe = req.body;
  subscribe.subscribers = ["-LDA0LsRDrPauVRF1BS1"];
  console.log(subscribe);
  const subscribeRef = subscribesRef.push();
  subscribeRef.set(subscribe)
    .then((data) => {
      res.redirect(`/subscribe`);
    });
});

/* GET home page. */
// app.get('/', function (req, res, next) {
//   res.render('index', {
//     title: 'Express'
//   });
// });

/* create LINE SDK config from env variables*/
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

var bot = linebot(config);

bot.on('follow', function (event) {
  console.log(event);
  const userRef = usersRef.push();
  let userObj = {};

  userObj.userId = event.source.userId;
  userObj.timestamp = event.timestamp;
  usersRef.once('value')
    .then((snapshot) => {
      // console.log(snapshot.val().userId, event.source.userId);
      console.log(snapshot.val());
      if (snapshot.val()) {
        var exist = false;
        var key = '';
        snapshot.forEach(element => {
          if (element.val().userId === event.source.userId) {
            exist = true;
            key = element.key;
          }
        });
        if (exist) {
          console.log(key);
          usersRef.child(key).update(userObj)
            .then((data) => {
              console.log(data);

            });
        } else {
          userRef.set(userObj)
            .then((data) => {
              event.reply("こんにちは").then(function (data) {
                console.log('follow');
              }).catch(function (error) {
                console.log(error);
              });
            });
        }

      } else {
        userRef.set(userObj)
          .then((data) => {
            event.reply("こんにちは").then(function (data) {
              console.log('follow');
            }).catch(function (error) {
              console.log(error);
            });
          });
      }
    });
});

bot.on('unfollow', function (event) {
  usersRef.once('value')
    .then((snapshot) => {
      // console.log(snapshot.val().userId, event.source.userId);
      if (snapshot.val()) {
        var exist = false;
        var key = '';
        snapshot.forEach(element => {
          if (element.val().userId === event.source.userId) {
            exist = true;
            key = element.key;
          }
        });
        if (exist) {
          console.log(key);
          usersRef.child(key).remove()
            .then((data) => {
              console.log(data);
            });
        }
      }
    });
});

bot.on('message', function (event) {
  feed.fetchDramas(dramas => {
    var replys = [];
    feed.parseDramaList(event.message.text, dramas).forEach((data) => {
      // console.log(data);
      replys.push({
        type: 'text',
        text: `新片到了 【${data.title}】 ${data.link}`
      });
    });
    var temp = [];
    for (let index = 1; index <= replys.length; index++) {
      temp.push(replys[index - 1]);
      if (index % 4 === 0 || index === replys.length) {
        bot.push(event.source.userId, temp);
        temp = [];
      }
    }
  });
});
const linebotParser = bot.parser();
app.post('/linewebhook', linebotParser);

cron.schedule('*/30 * * * *', function(){
  crawler();
  // console.log("123");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});