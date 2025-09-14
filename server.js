const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

// Setup Express
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Connect to SQLite (or create if not exists)
const db = new sqlite3.Database("./spins.db", (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create table for spins if not exists
db.run(`CREATE TABLE IF NOT EXISTS spins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  specialCode TEXT,
  prize TEXT,
  time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Create table for special codes
db.run(`CREATE TABLE IF NOT EXISTS special_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  used INTEGER DEFAULT 0,
  userId TEXT,
  used_at TIMESTAMP
)`);

// --- ROUTES ---

// Spin endpoint
app.post("/api/spin", (req, res) => {
  const { userId, specialCode, prize } = req.body;

  if (!userId || !specialCode || !prize) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Check if the special code exists and is unused
  db.get(
    "SELECT * FROM special_codes WHERE code = ? AND used = 0",
    [specialCode],
    (err, codeRow) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!codeRow) return res.status(400).json({ error: "Invalid or already used code" });

      // Save spin in spins table
      db.run(
        "INSERT INTO spins (userId, specialCode, prize) VALUES (?, ?, ?)",
        [userId, specialCode, prize],
        function (err) {
          if (err) return res.status(500).json({ error: "Insert error" });

          // Mark code as used
          db.run(
            "UPDATE special_codes SET used = 1, userId = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?",
            [userId, specialCode],
            function (err2) {
              if (err2) return res.status(500).json({ error: "Update code error" });

              res.json({ success: true, prize });
            }
          );
        }
      );
    }
  );
});

// Admin endpoint: get all spins
app.get("/api/spins", (req, res) => {
  db.all("SELECT * FROM spins ORDER BY time DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});