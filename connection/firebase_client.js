var firebase = require("firebase");

require('dotenv').config();

var config = {
    "apiKey": process.env.FIREBASE_API_KEY,
    "authDomain": process.env.FIREBASE_AUTH_DOMAIN,
    "databaseURL": process.env.FIREBASE_DATABASEURL,
    "projectId": process.env.FIREBASE_PROJECT_ID,
    "storageBucket": "",
    "messagingSenderId": process.env.FIREBASE_MESSAGING_SENDER_ID
};
firebase.initializeApp(config);
module.exports = firebase;