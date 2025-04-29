import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
  
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCQv5mGd4Kr6Csa_GPRt4DCbAWjB6oYiYs";

  console.log("GEMINI_API_KEY:", apiKey);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-04-17",
  });
  
  const generationConfig = {
    temperature: 0.7, // Réduit pour plus de cohérence dans les évaluations
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  };
  
  async function run(prompt) {
    try {
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });
  
        const result = await chatSession.sendMessage(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in Gemini API call:", error);
        throw error;
    }
  }
  
  export default run;