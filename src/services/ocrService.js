const vision = require("@google-cloud/vision");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)
});

async function extractText(imagePath) {
  try {
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      console.log("No text detected");
      return "";
    }

    const text = detections[0].description;
    console.log("OCR TEXT:", text);
    return text;
  } catch (error) {
    console.error("OCR ERROR:", error);
    return "";
  }
}

module.exports = { extractText };