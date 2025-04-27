//loadRubric
import AdmZip from "adm-zip";
import fs from "fs";
import yaml from "yaml";

export const loadRubric = (filePath) => {
   const file = fs.readFileSync(filePath, "utf-8");
   const data = yaml.parse(file);
   // console.log("Data from utils is:", data);
   return data.rubric;
};


//extracting Zip file
export const extractZip = async(zipPath, targetDir) => {
   const zip = new AdmZip(zipPath);
   // let zipEntries = zip.getEntries();
   //Extracting everything
   zip.extractAllTo(targetDir, true);
};