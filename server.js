const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "."))); // serve index.html

const db = new sqlite3.Database("./spins.db", (err) => {
  if (err) console.error("❌ Could not connect to database", err);
  else console.log("✅ Connected to SQLite database");
});

db.run(`CREATE TABLE IF NOT EXISTS spins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  specialCode TEXT,
  prize TEXT,
  time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS special_codes (
  code TEXT PRIMARY KEY,
  used INTEGER DEFAULT 0,
  userId TEXT,
  used_at TIMESTAMP
)`);

// API to save spin
app.post("/api/spin", (req, res) => {
  const { userId, specialCode, prize } = req.body;
  if (!userId || !specialCode || !prize) return res.status(400).json({ error: "Missing fields" });

  db.get("SELECT * FROM special_codes WHERE code = ? AND used = 0", [specialCode], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(400).json({ error: "Invalid or used code" });

    db.run("INSERT INTO spins (userId, specialCode, prize) VALUES (?, ?, ?)", [userId, specialCode, prize], function(err) {
      if (err) return res.status(500).json({ error: "Insert error" });

      db.run("UPDATE special_codes SET used = 1, userId = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?", [userId, specialCode], function(err2) {
        if (err2) return res.status(500).json({ error: "Update code error" });
        res.json({ success: true, prize });
      });
    });
  });
});

// API to get all spins
app.get("/api/spins", (req, res) => {
  db.all("SELECT * FROM spins ORDER BY time DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(✅ Server running on port ${PORT});
});