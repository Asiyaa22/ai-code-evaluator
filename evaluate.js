import fs from "fs";
import { evaluateWithGemini } from "./gemini.js";

export const evaluateAllSubmissions = async(submissionDir, rubric) => {
    // const studentFolders = fs.readdirSync(submissionDir).filter(name => {
    //     fs.statSync(`${submissionDir}/${name}`).isDirectory();        
    // })

    // post-fix
    let studentFolders = fs.readdirSync(submissionDir);

// Check if there's only one folder inside (i.e., the wrapper)
if (studentFolders.length === 1) {
  const maybeNested = `${submissionDir}/${studentFolders[0]}`;
  if (fs.statSync(maybeNested).isDirectory()) {
    console.log("🧭 Using nested folder:", maybeNested);
    studentFolders = fs.readdirSync(maybeNested).map(name => `${studentFolders[0]}/${name}`);
  }
}

    //printing students code folders basic
    console.log("👀 Student folders found:", studentFolders);

    //looping through each student folder
    for(const student of studentFolders){
        const studenPath = `${submissionDir}/${student}`;

        const htmlPath = `${studenPath}/index.html`;
        const cssPath = `${studenPath}/style.css`;
        console.log("this is html path", htmlPath);
        console.log("this is css path", cssPath);

        
        const html = fs.existsSync(htmlPath)
        ? fs.readFileSync(htmlPath, "utf-8")
        : "";

        const css = fs.existsSync(cssPath)
        ? fs.readFileSync(cssPath, "utf-8")
        : "";
        
        console.log("now moving to run evaluateStudent() then will log the result")
        // const result = await evaluateStudent(html, css, rubric, studentName);
        //printing rubric
        console.log("Rubric in evaluate", rubric);
        try {
            const result = await evaluateStudent(html, css, rubric, student);
            console.log(`📄 Result for ${student}:`, result);
          } catch (err) {
            console.error(`❌ Error while evaluating ${student}:`, err.message);
          }
        // console.log(`Student result:`, result);
    }
}


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
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
  }
    // const response = await evaluateWithGemini(prompt);
    // console.log(response);
    // return response;
  };
  