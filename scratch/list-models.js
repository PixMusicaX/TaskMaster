
const GEMINI_API_KEY = "AIzaSyDCCHHMrLSoSRdJ9kTb5e5Dwdyx5jAWaZ8";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models?key=" + GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await fetch(GEMINI_URL);
    const result = await response.json();
    console.log("Models:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
