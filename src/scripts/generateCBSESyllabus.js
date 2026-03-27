const mongoose = require("mongoose");
require("dotenv").config();

const SyllabusNode = require("../models/SyllabusNode");
const aiService = require("../services/aiService");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo connected");
};

const GRADES = [
  "Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10",
  "Grade 11","Grade 12"
];

const SUBJECTS = {
  "Grade 1": ["English", "Math", "EVS", "Hindi"],
  "Grade 2": ["English", "Math", "EVS", "Hindi"],
  "Grade 3": ["English", "Math", "EVS", "Hindi"],
  "Grade 4": ["English", "Math", "EVS", "Hindi"],
  "Grade 5": ["English", "Math", "EVS", "Hindi"],

  "Grade 6": ["Science", "Math", "English", "Social Science", "Hindi", "Sanskrit"],
  "Grade 7": ["Science", "Math", "English", "Social Science", "Hindi", "Sanskrit"],
  "Grade 8": ["Science", "Math", "English", "Social Science", "Hindi", "Sanskrit"],

  "Grade 9": ["Science", "Math", "English", "Social Science", "Hindi", "Sanskrit", "Information Technology"],
  "Grade 10": ["Science", "Math", "English", "Social Science", "Hindi", "Sanskrit", "Information Technology"],

  "Grade 11": [
    "Physics", "Chemistry", "Biology", "Math",
    "English", "Accountancy", "Business Studies", "Economics",
    "Computer Science", "Informatics Practices",
    "History", "Political Science", "Geography", "Psychology"
  ],

  "Grade 12": [
    "Physics", "Chemistry", "Biology", "Math",
    "English", "Accountancy", "Business Studies", "Economics",
    "Computer Science", "Informatics Practices",
    "History", "Political Science", "Geography", "Psychology"
  ]
};
async function generate() {
  for (let grade of GRADES) {
    const subjects = SUBJECTS[grade];

    for (let subject of subjects) {
      console.log(`Generating ${grade} - ${subject}`);

      const prompt = `
Give CBSE syllabus for ${grade} ${subject}.

Return JSON array like:
[
 {
  "chapterNumber": 1,
  "chapterName": "",
  "topicName": "",
  "keywords": ["", ""],
  "aliases": ["", ""]
 }
]

Keep it accurate CBSE level.
Max 30 entries.
`;

      const response = await aiService.getAnswer([
        { role: "user", content: prompt }
      ]);

      let data;

      try {
        data = JSON.parse(response);
      } catch (err) {
        console.log("JSON parse failed, skipping...");
        continue;
      }

      for (let item of data) {
        await SyllabusNode.create({
          board: "CBSE",
          grade,
          subject,
          chapterCode: `CBSE-${grade}-${subject}-${item.chapterNumber}`,
          chapterNumber: item.chapterNumber,
          chapterName: item.chapterName,
          topicCode: `T-${item.chapterNumber}`,
          topicName: item.topicName,
          keywords: item.keywords || [],
          aliases: item.aliases || [],
          active: true
        });
      }
    }
  }

  console.log("DONE");
}

connectDB().then(generate);