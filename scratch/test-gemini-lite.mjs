
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.gemini_key;

async function testGemini() {
  if (!GEMINI_API_KEY) {
    console.error("No key found in process.env.gemini_key");
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    console.log("Testing gemini-3.1-flash-lite...");
    const result = await model.generateContent("Return a JSON object with title 'Test'.");
    const text = result.response.text();
    console.log("Result:", text);
  } catch (error) {
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
  }
}

testGemini();
