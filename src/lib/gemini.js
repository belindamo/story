import { GoogleGenerativeAI } from '@google/generative-ai';
require('dotenv').config();
const { GEMINI_API_KEY, GEMINI_MODEL } = process.env;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Function to build the prompt for Google Generative AI
const buildGoogleGenAIPrompt = (messages) => {
  // Ensure the last message is from a "user"
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw new Error("The last message in the prompt must be from the 'user'.");
  }
  
  return {
    contents: messages
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      })),
  };
};

// Updated sendMessageToGemini function to actually send the message and return the response
export const sendMessageToGemini = async (userMessage, onMessagePart) => {
  const messages = [
    { role: 'user', content: userMessage },
  ];

  try {
    const requestOptions = {
      apiVersion: 'v1beta'
    };

    const prompt = buildGoogleGenAIPrompt(messages);

    const {stream, response} = await genAI
      .getGenerativeModel({ model: GEMINI_MODEL}, requestOptions)
      .generateContentStream(prompt);
  
    for await (const data of stream) {
      const textParts = data.candidates.map(candidate => 
        candidate.content && candidate.content.parts ? candidate.content.parts.map(part => part.text).join(' ') : ''
      ).join(' ');
      
      // Call the callback with each new message part
      onMessagePart(textParts);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};