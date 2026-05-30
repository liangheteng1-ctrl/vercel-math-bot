var crypto = require('crypto');
var LINE_TOKEN = proces…KEN;
var LINE_SECRET = proces…RET;
var AI_KEY = proces…KEY;
var AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.0-flash-vision:free';

function verify(body, sig) {
  return crypto.createHmac('sha256', LINE_SECRET).update(body).digest('base64') === sig;
}

async function reply(token, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: '***' + LINE_TOKEN
    },
    body: JSON.stringify({ replyToken: token, messages: [{ type: 'text', text: text }] })
  });
}

async function getImg(id) {
  var r = await fetch('https://api-data.line.me/v2/bot/message/' + id + '/content', {
    headers: { Authorization: '***' + LINE_TOKEN }
  });
  var b = Buffer.from(await r.arrayBuffer());
  return {
    b64: b.toString('base64'),
    mime: b[0] === 0xFF ? 'image/jpeg' : 'image/png'
  };
}

async function askAI(messages) {
  var c = new AbortController();
  var t = setTimeout(function() { c.abort(); }, 9000);
  try {
    var r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: c.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: '***' + AI_KEY,
        'HTTP-Referer': 'https://vercel-math-bot.vercel.app',
        'X-Title': 'MathBot'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        max_tokens: 1024,
        temperature: 0.3
      })
    });
    var d = await r.json();
    var txt = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    return txt ? txt.trim() : 'ขออภัย เกิดข้อผิดพลาดครับ';
  } finally {
    clearTimeout(t);
  }
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    var raw = JSON.stringify(req.body);
    var sig = req.headers['x-line-signature'];
    if (!sig || !verify(raw, sig)) {
      res.status(401).end();
      return;
    }
  } catch (e) {
    res.status(200).end();
    return;
  }

  var events = req.body.events || [];
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    try {
      if (e.type === 'follow') {
        await reply(e.replyToken, 'สวัสดี! ถามโจทย์คณิตศาสตร์มาได้เลยครับ');
      } else if (e.type === 'message') {
        if (e.message.type === 'text') {
          var msgs = [
            { role: 'system', content: 'คุณคือติวเตอร์คณิตศาสตร์ ตอบเป็นภาษาไทย อธิบายทีละขั้นตอน' }
          ];
          msgs.push({ role: 'user', content: e.message.text });
          var ans = await askAI(msgs);
          await reply(e.replyToken, ans);
        } else if (e.message.type === 'image') {
          var img = await getImg(e.message.id);
          var msgs = [
            { role: 'system', content: 'คุณคือติวเตอร์คณิตศาสตร์ ตอบเป็นภาษาไทย อธิบายทีละขั้นตอน' },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'ช่วยแก้โจทย์คณิตศาสตร์ในรูปนี้ทีละขั้นตอน' },
                { type: 'image_url', image_url: { url: 'data:' + img.mime + ';base64,' + img.b64 } }
              ]
            }
          ];
          var ans = await askAI(msgs);
          await reply(e.replyToken, ans);
        } else {
          await reply(e.replyToken, 'ส่งได้แค่ข้อความหรือรูปภาพนะครับ');
        }
      }
    } catch (err) {
      // skip errors for single events
    }
  }

  res.status(200).end();
};
