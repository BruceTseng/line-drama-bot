var express = require('express');
var linebot = require('linebot');
var firebaseAdminDb = require('./connection/firebase_admin');
var usersRef = firebaseAdminDb.ref('/users');
var feed = require('./feed');
var path = require('path');
require('dotenv').config()
var usersRouter = require('./routes/users');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use('/users', usersRouter);

/* GET home page. */
app.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });
});

// create LINE SDK config from env variables
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
        console.log(userObj);
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
          usersRef.child(key).remove()
            .then((data) => {
              console.log(data);
            });
        }
      }
    });
});

function parseDramaList(type, dramas) {
  var temps = [];
  dramas.forEach((drama) => {
    if (drama.type === type) {
      temps.push(drama);
    }
  });
  return temps;
}

bot.on('message', function (event) {

  feed.callMe(dramas => {
    var replys = [];
    parseDramaList(event.message.text, dramas).forEach((data) => {
      // console.log(data);
      replys.push({
        type: 'text',
        text: `新片到了 【${data.title}】 ${data.link}`
      });
    });
    var temp = [];
    for (let index = 1; index <= replys.length; index++) {
      temp.push(replys[index-1]);
      if (index % 4 === 0 || index === replys.length) {
        bot.push(event.source.userId, temp);
        temp = [];
      }
    }
  })
  // event.reply(event.message.text).then(function (data) {
  //   // success
  // }).catch(function (error) {
  //   // error
  // });

  //setTimeout(() => {

  //   bot.push(event.source.userId, "hello");
  // }, 3000);
});
const linebotParser = bot.parser();
app.post('/linewebhook', linebotParser);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});