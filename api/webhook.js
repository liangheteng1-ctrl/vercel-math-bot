const crypto = require('crypto');
const LINE_TOKEN = proces…KEN;
const LINE_SECRET = proces…RET;
const AI_KEY = proces…KEY;
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-vision:free';

function verify(body, sig) {
  return crypto.createHmac('sha256', LINE_SECRET).update(body).digest('base64') === sig;
}

async function reply(token, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method:'POST', headers:{'Content-Type':'application/json',Authorization:'***' + LINE_TOKEN},
    body: JSON.stringify({replyToken:token,messages:[{type:'text',text:text}]})
  });
}

async function getImg(id) {
  var r = await fetch('https://api-data.line.me/v2/bot/message/' + id + '/content', {headers:{Authorization:'***' + LINE_TOKEN}});
  var b = Buffer.from(await r.arrayBuffer());
  return { b64: b.toString('base64'), mime: b[0]===0xFF?'image/jpeg':'image/png' };
}

async function askAI(messages) {
  var c = new AbortController();
  var t = setTimeout(function(){c.abort()}, 9000);
  try {
    var r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST', signal:c.signal,
      headers:{'Content-Type':'application/json',Authorization:'***' + AI_KEY,'HTTP-Referer':'https://vercel-math-bot.vercel.app','X-Title':'MathBot'},
      body: JSON.stringify({model:AI_MODEL,messages:messages,max_tokens:1024,temperature:0.3})
    });
    var d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || 'ขออภัย เกิดข้อผิดพลาดครับ';
  } finally { clearTimeout(t); }
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    if (!verify(JSON.stringify(req.body), req.headers['x-line-signature'])) return res.status(401).end();
  } catch(e) { return res.status(200).end(); }

  for (var i = 0; i < req.body.events.length; i++) {
    var e = req.body.events[i];
    if (e.type === 'follow') {
      await reply(e.replyToken, 'สวัสดีจ้า! ถามโจทย์คณิตศาสตร์มาได้เลยครับ');
      continue;
    }
    if (e.type !== 'message') continue;

    var msgs = [{ role:'system', content:'คุณคือติวเตอร์คณิตศาสตร์ ตอบเป็นภาษาไทย อธิบายทีละขั้นตอน ใช้สัญลักษณ์คณิตศาสตร์' }];
    if (e.message.type === 'image') {
      try {
        var img = await getImg(e.message.id);
        msgs.push({ role:'user', content:[{type:'text',text:'ช่วยแก้โจทย์คณิตศาสตร์ในรูปนี้'},{type:'image_url',image_url:{url:'data:'+img.mime+';base64,'+img.b64}}] });
      } catch(err) { await reply(e.replyToken, 'อ่านรูปไม่สำเร็จ'); continue; }
    } else if (e.message.type === 'text') {
      msgs.push({ role:'user', content: e.message.text });
    } else { await reply(e.replyToken, 'ส่งได้แค่ข้อความหรือรูปภาพนะครับ'); continue; }

    try {
      var ans = await askAI(msgs);
      await reply(e.replyToken, ans);
    } catch(err) { await reply(e.replyToken, 'ขออภัย เกิดข้อผิดพลาด'); }
  }
  res.status(200).end();
};
