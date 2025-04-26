import fs, { writeFileSync } from "fs";
import { evaluateWithGemini } from "./gemini.js";

let results = [];
export const evaluateAllSubmissions = async (submissionDir, rubric) => {
  // const studentFolders = fs.readdirSync(submissionDir).filter(name => {
  //     fs.statSync(`${submissionDir}/${name}`).isDirectory();
  // })

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
      });
    } catch (err) {
      console.error(`❌ Error while evaluating ${student}:`, err.message);
      return "Gemini API error";
    }
    // console.log(`Student result:`, result);
  }

  //creating csv format taake it should not break
  // let csvContent = "Student,Result\n";

  // Creating CSV format with summary
let csvContent = "Student,Marks,Feedback\n";

// Loop through results and format the CSV rows
results.forEach((entry) => {
  // Extract total marks (assuming it's in the format "X/20")
  const totalMarksMatch = entry.result.match(/Total Marks: (\d+\/20)/);
  const totalMarks = totalMarksMatch ? totalMarksMatch[1] : "N/A";
  
  // Extract feedback summary from the breakdown
  const feedbackMatch = entry.result.match(/- Structure:.*?([^.]+)\./);
  const feedback = feedbackMatch ? feedbackMatch[1] : "No feedback available";

  // Add to CSV
  csvContent += `"${entry.student}","${totalMarks}","${feedback.replace(/"/g, "'")}"\n`;
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
  const rubricText = Object.entries(rubric)
    .map(([key, value]) => `- ${key.replaceAll("_", " ")} (${value} marks)`)
    .join("\n");

  const prompt = `
  You are an AI Code Evaluator. Use the rubric below to evaluate the following code.
  
  Rubric:
  ${rubricText}
  
  Student Code:
  HTML:
  ${html}
  
  CSS:
  ${css}
  
  Instructions:
  1. Give total marks (out of 20).
  2. Break down marks per category.
  3. Give clear feedback/suggestions for each category.
  
  Respond in this format:
  Student: ${studentName}
  Total Marks: X/20
  Breakdown:
  - Structure: X/3 - Feedback
  - Semantics: X/3 - Feedback
  ...etc
  `;
  try {
    const response = await evaluateWithGemini(prompt);
    console.log(response);
    return response;
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
   return `Error evaluating ${studentName}`;
  }
  // const response = await evaluateWithGemini(prompt);
  // console.log(response);
  // return response;
};

//Pro=tip we can use promises instead of for of to make it faster
