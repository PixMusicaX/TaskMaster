
const GEMINI_API_KEY = process.env.gemini_key;
console.log("Key found:", !!GEMINI_API_KEY);
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

async function testGemini() {
  if (!GEMINI_API_KEY) {
    console.error("No key found in process.env.gemini_key");
    return;
  }
  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Return a JSON object with title 'Test' and description 'Test desc' and quote 'Test quote'."
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
        }
      })
    });

    const result = await response.json();
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testGemini();
