import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { clearFolder } from "./clearFolder.js";
import { loadRubric } from "./utils.js";
import { extractZip } from "./utils.js";
import { evaluateAllSubmissions } from "./evaluate.js";
import env from "dotenv";
env.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads and outputs folders if not exist
if (!fs.existsSync("./submissions")) fs.mkdirSync("./submissions");
if (!fs.existsSync("./outputs")) fs.mkdirSync("./outputs");

// Multer setup
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// Upload endpoint
app.post("/upload", upload.fields([{ name: "zipfile" }]), (req, res) => {
  try {
    console.log("Received upload request");

    // Save the uploaded zip file
    const zipFile = req.files.zipfile[0];
    fs.renameSync(zipFile.path, "./student-submissions.zip");

    // Save rubric yaml from form field
    const rubricYamlContent = req.body.rubric_yaml;
    fs.writeFileSync("./rubric.yaml", rubricYamlContent);

    console.log("Upload successful");
    res.status(200).json({ message: "Upload successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// Process endpoint
app.post("/process", async (req, res) => {
  try {
    console.log("Processing started...");

    // Load rubric
    const rubric = loadRubric("./rubric.yaml");

    // Clear folders
    clearFolder("./submissions");
    clearFolder("./outputs");

    // Extract ZIP
    await extractZip("./student-submissions.zip", "./submissions");
    console.log("Zip extracted");

    // Evaluate
    await evaluateAllSubmissions("./submissions", rubric);
    console.log("Evaluations done");

    res.status(200).json({ message: "Processing completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed", details: err.message });
  }
});

// Download results endpoint
app.get("/download", (req, res) => {
  const resultsPath = path.resolve("./outputs/results.csv");

  if (fs.existsSync(resultsPath)) {
    res.download(resultsPath, "results.csv", (err) => {
      if (err) console.error("Download error:", err.message);
    });
  } else {
    res.status(404).json({ error: "Results not found" });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
