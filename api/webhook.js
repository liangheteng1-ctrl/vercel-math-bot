var crypto = require("crypto");
var MS = "f6d14b0ff265b8f3d5b2a30f138957a8";
var LT = "Bbwmp9fxsh9+J/Gxv+n7OC2m78adJv8XfyUvTms3FMVD2usfIT9b27doUaZUJmNZzbEe7RtNuNQhedOqEZYvDmXv8D5qFfU517S9cV7lb9EVns37SwwXkGBwqtB6KOIvalaTTaDPNNhrNd41bGq1GwdB04t89/1O/w1cDnyilFU=";
module.exports = async function(rq, rs) {
  console.log("GOT REQUEST", rq.method);
  if(rq.method!=="POST"){rs.status(405).end();return;}
  try{var raw=JSON.stringify(rq.body);var sig=rq.headers["x-line-signature"];if(!sig||crypto.createHmac("sha256",MS).update(raw).digest("base64")!==sig){console.log("SIG FAIL");rs.status(401).end();return;}}catch(e){console.log("VERIFY ERR",e.message);rs.status(200).end();return;}
  var ev=rq.body.events||[];
  console.log("EVENTS", ev.length);
  for(var i=0;i<ev.length;i++){var e=ev[i];console.log("EVENT", e.type);
    if(e.type==="message"&&e.message&&e.message.type==="text"){
      console.log("TEXT MSG:", e.message.text);
      console.log("REPLY-TOKEN:", e.replyToken.substring(0,10));
      try{
        var rr=await fetch("https://api.line.me/v2/bot/message/reply",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"***"+LT},body:JSON.stringify({replyToken:e.replyToken,messages:[{type:"text",text:"OK: "+e.message.text}]})});
        console.log("REPLY STATUS", rr.status);
        var rt=await rr.text();
        console.log("REPLY BODY", rt.substring(0,100));
      }catch(er){console.log("REPLY ERR", er.message);}
    }
  }
  rs.status(200).end();
};
