import env from "dotenv";
import { loadRubric } from "./utils.js"
// import { extractZip } from "./utils.js"
// import { evaluateAllSubmissions } from "./evaluate.js"

env.config();

const run = async () => {
    console.log("Starting ai code evaluator🚀");

    //load rubric from YAML
    const rubric = loadRubric("./rubric.yaml");
    console.log("Loaded Rubric:", rubric);

    //extract zip file
    // await extractZip("./student-submission.zip", "./submissions");

    //evaluate submissions
    // await evaluateAllSubmissions("./submissions");


    console.log("✅ Done! Results saved in /outputs folder.");
}

run();