import env from "dotenv";
import { clearFolder } from "./clearFolder.js";
import { loadRubric } from "./utils.js";
import { extractZip } from "./utils.js";
import { evaluateAllSubmissions } from "./evaluate.js";

env.config();

const run = async () => {
  console.log("Starting ai code evaluator🚀");

  //load rubric from YAML
  const rubric = loadRubric("./rubric.yaml");
  console.log("Loaded Rubric:", rubric);

  // Before starting evaluation clearing if folders exist
  clearFolder("./submissions");
  clearFolder("./outputs");

  //extract zip file
  await extractZip("./student-submissions.zip", "./submissions");
  console.log("Zip files extracted");

  //evaluate submissions
  await evaluateAllSubmissions("./submissions", rubric);
  console.log("Evaluations are also done");

  console.log("✅ Done! Results saved in /outputs folder.");
};

run();
