var express = require('express');
var router = express.Router();
var firebaseAdminDb = require('../connection/firebase_admin');
var usersRef = firebaseAdminDb.ref('/users');
var moment = require('moment');

/* GET users listing. */
router.get('/', function(req, res, next) {
  
  let users = [];
  usersRef.once('value')
  .then((snapshot) => {
    snapshot.forEach(element => {
      users.push(element.val());
    });
    res.render('users', {
      users,
      moment
    });
  })
});

module.exports = router;
