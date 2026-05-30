var crypto = require("crypto");
var MS = "f6d14b0ff265b8f3d5b2a30f138957a8";
var LT = "geuJPKOIAK2vgcIhrNLXDmYXe97a/mUqUXjY4EGSnH1i/K5W2qi+VyH5R4aYgWNqzbEe7RtNuNQhedOqEZYvDmXv8D5qFfU517S9cV7lb9FC3zkSEwMIkfDtetPuxa46K2v6/WfzJN6SbPgZQOOjvgdB04t89/1O/w1cDnyilFU=";
module.exports = async function(rq, rs) {
  if(rq.method!=="POST"){rs.status(405).end();return;}
  try{var raw=JSON.stringify(rq.body);var sig=rq.headers["x-line-signature"];if(!sig||crypto.createHmac("sha256",MS).update(raw).digest("base64")!==sig){rs.status(401).end();return;}}catch(e){rs.status(200).end();return;}
  var ev=rq.body.events||[];
  for(var i=0;i<ev.length;i++){var e=ev[i];if(e.type==="message"&&e.message&&e.message.type==="text"){await fetch("https://api.line.me/v2/bot/message/reply",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"***"+LT},body:JSON.stringify({replyToken:e.replyToken,messages:[{type:"text",text:"hello! i see: "+e.message.text}]})});}}
  rs.status(200).end();
};
