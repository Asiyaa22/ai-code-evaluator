import fs, { writeFileSync } from "fs";
import { evaluateWithGemini } from "./gemini.js";

let results = [];
export const evaluateAllSubmissions = async (submissionDir, rubric) => {
  // post-fix
  let studentFolders = fs.readdirSync(submissionDir);

  // Check if there's only one folder inside (i.e., the wrapper)
  //okay so this code handles if the zip folder is nested or not
  //works for whole folder
  if (studentFolders.length === 1) {
    const maybeNested = `${submissionDir}/${studentFolders[0]}`;
    if (fs.statSync(maybeNested).isDirectory()) {
      console.log("🧭 Using nested folder:", maybeNested);
      studentFolders = fs
        .readdirSync(maybeNested)
        .map((name) => `${studentFolders[0]}/${name}`);
    }
  }

  //printing students code folders basic
  console.log("👀 Student folders found:", studentFolders);
  //sunction to find student folder
  //works for individual student folder
  const findStudentCodeFolder = (studentFolderPath) => {
    if (fs.existsSync(`${studentFolderPath}/index.html`)) {
      return studentFolderPath;
    }
    const items = fs.readdirSync(studentFolderPath);
    if (
      items.length === 1 &&
      fs.statSync(`${studentFolderPath}/${items[0]}`).isDirectory()
    ) {
      const nestedPath = `${studentFolderPath}/${items[0]}`;
      if (fs.existsSync(`${nestedPath}/index.html`)) {
        return nestedPath;
      }
    }
    return null; // No code found
  };

  //looping through each student folder
  for (const student of studentFolders) {
    const studentPath = `${submissionDir}/${student}`;
    //now this
    const codeFolder = findStudentCodeFolder(studentPath);
    if (!codeFolder) {
      console.warn(`⚠️ Skipping ${student} — no index.html found`);
      continue;
    }
    //finding if html file is present or not
    const files = fs.readdirSync(codeFolder);

    let htmlFile = files.find((file) => file.toLowerCase() === "index.html");
    if (!htmlFile) {
      htmlFile = files.find((file) => file.toLowerCase().endsWith(".html"));
    }

    let cssFile = files.find((file) => file.toLowerCase() === "style.css");
    if (!cssFile) {
      cssFile = files.find((file) => file.toLowerCase().endsWith(".css"));
    }
    const htmlPath = `${codeFolder}/${htmlFile}`;
    const cssPath = cssFile ? `${codeFolder}/${cssFile}` : null;
    console.log("this is html path", htmlPath);
    console.log("this is css path", cssPath);

    const html = fs.existsSync(htmlPath)
      ? fs.readFileSync(htmlPath, "utf-8")
      : "";

    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf-8") : "";

    let missingFilesNote = "";
    
    if(!html.trim() && !css.trim()){
      missingFilesNote = "Both HTML and CSS files are missing";
    }else if(!html.trim()){
      missingFilesNote = "HTML file is Missing"; 
    }else if(!css.trim()){
      missingFilesNote = "CSS file is Missing";
    }else {
      missingFilesNote = "Files found.";
    }
    //missing files logic sorted

    //now moving to flag for manual correction
    let needsManualCorrection = "No";

    if(html.length < 30 || css.length < 10){
      needsManualCorrection = "Yes";
    }


    console.log("now moving to run evaluateStudent() then will log the result");
    // const result = await evaluateStudent(html, css, rubric, studentName);
    //printing rubric
    console.log("Rubric in evaluate", rubric);
    try {
      const result = await evaluateStudent(html, css, rubric, student);
      console.log(`📄 Result for ${student}:`, result);
      results.push({
        student: student,
        result: result, // this is the full Gemini response text
        missingFilesNote: missingFilesNote,
        needsManualCorrection: needsManualCorrection
      });
    } catch (err) {
      console.error(`❌ Error while evaluating ${student}:`, err.message);
      return "Gemini API error";
    }
    // console.log(`Student result:`, result);
  }

  //creating csv format taake it should not break
  // let csvContent = "Student,Result\n";

  // Creating CSV format with summary this is actaul header
let csvContent = "Student,Marks,Feedback,Missing Files,Needs Manual Correction\n";

// Loop through results and format the CSV rows
results.forEach((entry) => {
  // Extract total marks (assuming it's in the format "X/20")
  // const totalMarksMatch = entry.result.match(/Total Marks: (\d+\/20)/);
  //the above code is giving n/a in ouput results so the corrected code is below with proper regex
  // Use the updated regex to capture the total marks
  const totalMarksMatch = entry.result.match(/Total Marks: (\d+)\/(\d+)/);
  const totalMarks = totalMarksMatch ? totalMarksMatch[1] : "N/A";
  
  // Extract feedback summary from the breakdown
  // const feedbackMatch = entry.result.match(/- Structure:.*?([^.]+)\./);
  // const feedback = feedbackMatch ? feedbackMatch[1] : "No feedback available";
  //this code (above wala) will only give first content of feedback not the whole summarry to get detailed feedback this is code
  
  const breakdownMatch = entry.result.match(/Breakdown:(.*)/s);
  const feedback = breakdownMatch ? breakdownMatch[1].trim() : "NO detailed feedback available";

  // Add to CSV
  //this is csv row header basically
  csvContent += `"${entry.student}","${totalMarks}","${feedback.replace(/"/g, "'")}", "${entry.missingFilesNote}", "${entry.needsManualCorrection}"\n`;
});

// Write to file
// fs.writeFileSync("./outputs/results_summary.csv", csvContent);
// console.log("✅ Results saved to outputs/results_summary.csv");

  // results.forEach((entry) => {
  //   const sanitizedResult = entry.result.replace(/"/g, "'").replace(/\n/g, " ");
  //   csvContent += `"${entry.student}","${sanitizedResult}"\n`;    
  // });

  fs.writeFileSync("./outputs/results.csv", csvContent);
  console.log("✅ Results saved to outputs/results.csv");
};

//brain to gemini connector
export const evaluateStudent = async (html, css, rubric, studentName) => {

  //getting total marks 
  const totalMarks = Object.values(rubric).reduce((sum, val) => sum + val, 0);


  const expectedHtml = fs.readFileSync("./expected/index.html", "utf-8");
  const expectedCss = fs.readFileSync("./expected/style.css", "utf-8");
  

  const rubricText = Object.entries(rubric)
    .map(([key, value]) => `- ${key.replaceAll("_", " ")} (${value} marks)`)
    .join("\n");

  const prompt = `
You are an AI Code Evaluator and Corrector for student assignments.

Below is the official **Expected Output** code for this assignment:
(Expected HTML):
${expectedHtml}

(Expected CSS):
${expectedCss}

Below is the **Student's Submission**:
(Student HTML):
${html}

(Student CSS):
${css}

Rubric (Marks out of ${totalMarks}):
${rubricText}

Evaluation Instructions:
1. First, COMPARE the student's code with the Expected Output.
2. Identify major differences, missing sections, bad structure, bad CSS, etc.
3. Score the student's work according to the rubric.
4. Even if student's work is incomplete, still evaluate and suggest corrections.
5. Be strict but encouraging — reward correct effort, but point out flaws clearly.

FINAL RESPONSE FORMAT:
Student: ${studentName}
Total Marks: X/${totalMarks}
Breakdown:
- Structure: X/3 - Feedback
- Semantics: X/3 - Feedback
- Logical Properties: X/3 - Feedback
- Navbar: X/3 - Feedback
- Main Content: X/3 - Feedback
- Footer: X/2 - Feedback
- UI and Code Quality: X/3 - Feedback
`;


  try {
    const response = await evaluateWithGemini(prompt);
    console.log(response);
    return response;
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
   return `Error evaluating ${studentName}`;
  }
};

//Pro=tip we can use promises instead of for of to make it faster
