const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "zara-leads.sqlite");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS saved (
    place_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    website TEXT,
    maps_url TEXT,
    saved_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS contacted (
    place_id TEXT PRIMARY KEY,
    contacted_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true, app: "Zara Leads" }));

app.get("/api/config", (_req, res) => {
  res.json({ apiReady: Boolean(API_KEY) });
});

app.post("/api/search", async (req, res) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: "Live search is not configured yet. Add GOOGLE_PLACES_API_KEY in Render Environment settings." });
    const keyword = String(req.body.keyword || "").trim().slice(0, 100);
    const location = String(req.body.location || "").trim().slice(0, 120);
    const websiteFilter = req.body.websiteFilter === "has" ? "has" : req.body.websiteFilter === "none" ? "none" : "any";
    if (!keyword || !location) return res.status(400).json({ error: "Enter a business type and a city or country." });

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.types"
      },
      body: JSON.stringify({
        textQuery: `${keyword} in ${location}`,
        pageSize: 20
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error?.message || "Google Places search failed.";
      return res.status(response.status).json({ error: message });
    }

    let places = (data.places || []).map(p => ({
      id: p.id,
      name: p.displayName?.text || "Unnamed business",
      address: p.formattedAddress || "",
      website: p.websiteUri || "",
      mapsUrl: p.googleMapsUri || "",
      types: p.types || []
    }));
    if (websiteFilter === "none") places = places.filter(p => !p.website);
    if (websiteFilter === "has") places = places.filter(p => Boolean(p.website));

    const savedIds = new Set(db.prepare("SELECT place_id FROM saved").all().map(x => x.place_id));
    const contactedIds = new Set(db.prepare("SELECT place_id FROM contacted").all().map(x => x.place_id));
    res.json({
      leads: places.map(p => ({ ...p, saved: savedIds.has(p.id), contacted: contactedIds.has(p.id) })),
      count: places.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while searching. Please try again." });
  }
});

app.get("/api/saved", (_req, res) => {
  const rows = db.prepare(`
    SELECT s.place_id AS id, s.name, s.address, s.website, s.maps_url AS mapsUrl,
           CASE WHEN c.place_id IS NULL THEN 0 ELSE 1 END AS contacted
    FROM saved s LEFT JOIN contacted c ON c.place_id = s.place_id
    ORDER BY s.saved_at DESC
  `).all();
  res.json({ leads: rows.map(r => ({ ...r, saved: true, contacted: Boolean(r.contacted) })) });
});

app.post("/api/saved", (req, res) => {
  const p = req.body || {};
  if (!p.id || !p.name) return res.status(400).json({ error: "Missing business details." });
  db.prepare(`INSERT OR REPLACE INTO saved (place_id,name,address,website,maps_url) VALUES (?,?,?,?,?)`)
    .run(String(p.id), String(p.name).slice(0,200), String(p.address || "").slice(0,500), String(p.website || "").slice(0,500), String(p.mapsUrl || "").slice(0,1000));
  res.json({ ok: true });
});

app.delete("/api/saved/:id", (req, res) => {
  db.prepare("DELETE FROM saved WHERE place_id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/contacted/:id", (req, res) => {
  db.prepare("INSERT OR IGNORE INTO contacted (place_id) VALUES (?)").run(req.params.id);
  res.json({ ok: true });
});

app.delete("/api/contacted/:id", (req, res) => {
  db.prepare("DELETE FROM contacted WHERE place_id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Zara Leads running on port ${PORT}`));