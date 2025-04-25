//loadRubric
import fs from "fs";
import yaml from "yaml";

export const loadRubric = (filePath) => {
   const file = fs.readFileSync(filePath, "utf-8");
   const data = yaml.parse(file);
   return data.rubric;
};


//extracting Zip file