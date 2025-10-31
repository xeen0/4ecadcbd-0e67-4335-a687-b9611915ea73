const express = require("express");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const dayjs = require("dayjs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

function loadCSV(path) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

let devices = [];
let savings = [];

async function init() {
  devices = await loadCSV("./data/devices.csv");
  savings = await loadCSV("./data/device-saving.csv");
}

app.get("/api/devices", (req, res) => {
  res.json(devices);
});

app.get("/api/savings", (req, res) => {
  const { device_id, start_date, end_date } = req.query;

  if (!device_id || !start_date || !end_date) {
    return res.status(400).json({ error: "device_id, start_date, end_date are required" });
  }

  const start = dayjs(start_date);
  const end = dayjs(end_date);

  const filtered = savings.filter((row) => {
    const ts = dayjs(row.timestamp);
    return (
      row.device_id === device_id &&
      (ts.isAfter(start) || ts.isSame(start)) &&
      (ts.isBefore(end) || ts.isSame(end))
    );
  });

  res.json({
    device_id,
    start_date,
    end_date,
    count: filtered.length,
    data: filtered,
  });
});

init().then(() => {
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
});
