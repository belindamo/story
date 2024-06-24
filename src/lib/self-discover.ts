import { OpenAI } from "openai";
import { Configuration, ChatCompletionRequestMessage } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAI(configuration);

async function queryLLM(messages: ChatCompletionRequestMessage[], maxTokens = 2048, temperature = 0.1): Promise<string> {
  while (true) {
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages,
        temperature,
        max_tokens: maxTokens,
        n: 1,
      });

      const content = response.data.choices[0].message?.content.trim();

      if (content) {
        return content;
      } else {
        throw new Error("Empty response from OpenAI API");
      }
    } catch (error) {
      console.error("Failure querying the AI. Retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function queryOpenAI(prompt: string): Promise<string> {
  const messages: ChatCompletionRequestMessage[] = [
    { role: "user", content: prompt },
  ];
  return queryLLM(messages);
}

// STAGE 1

async function selectReasoningModules(taskDescription: string, reasoningModules: string[]): Promise<string> {
  const prompt = `Given the task: ${taskDescription}, which of the following reasoning modules are relevant? Do not elaborate on why.\n\n${reasoningModules.join("\n")}`;
  const selectedModules = await queryOpenAI(prompt);
  return selectedModules;
}

async function adaptReasoningModules(selectedModules: string, taskExample: string): Promise<string> {
  const prompt = `Without working out the full solution, adapt the following reasoning modules to be specific to our task:\n${selectedModules}\n\nOur task:\n${taskExample}`;
  const adaptedModules = await queryOpenAI(prompt);
  return adaptedModules;
}

async function implementReasoningStructure(adaptedModules: string, taskDescription: string): Promise<string> {
  const prompt = `Without working out the full solution, create an actionable reasoning structure for the task using these adapted reasoning modules:\n${adaptedModules}\n\nTask Description:\n${taskDescription}`;
  const reasoningStructure = await queryOpenAI(prompt);
  return reasoningStructure;
}

// STAGE 2

async function executeReasoningStructure(reasoningStructure: string, taskInstance: string): Promise<string> {
  const prompt = `Using the following reasoning structure: ${reasoningStructure}\n\nSolve this task, providing your final answer: ${taskInstance}`;
  const solution = await queryOpenAI(prompt);
  return solution;
}

// Example usage
async function main() {
  const reasoningModules = [
    "1. How could I devise an experiment to help solve that problem?",
    "2. Make a list of ideas for solving this problem, and apply them one by one to the problem to see if any progress can be made.",
    "4. How can I simplify the problem so that it is easier to solve?",
    "5. What are the key assumptions underlying this problem?",
    "6. What are the potential risks and drawbacks of each solution?",
    "7. What are the alternative perspectives or viewpoints on this problem?",
    "8. What are the long-term implications of this problem and its solutions?",
    "9. How can I break down this problem into smaller, more manageable parts?",
    "10. Critical Thinking: This style involves analyzing the problem from different perspectives, questioning assumptions, and evaluating the evidence or information available. It focuses on logical reasoning, evidence-based decision-making, and identifying potential biases or flaws in thinking.",
    "11. Try creative thinking, generate innovative and out-of-the-box ideas to solve the problem. Explore unconventional solutions, thinking beyond traditional boundaries, and encouraging imagination and originality.",
    "13. Use systems thinking: Consider the problem as part of a larger system and understanding the interconnectedness of various elements. Focuses on identifying the underlying causes, feedback loops, and interdependencies that influence the problem, and developing holistic solutions that address the system as a whole.",
    "14. Use Risk Analysis: Evaluate potential risks, uncertainties, and tradeoffs associated with different solutions or approaches to a problem. Emphasize assessing the potential consequences and likelihood of success or failure, and making informed decisions based on a balanced analysis of risks and benefits.",
    "16. What is the core issue or problem that needs to be addressed?",
    "17. What are the underlying causes or factors contributing to the problem?", 
    "18. Are there any potential solutions or strategies that have been tried before? If yes, what were the outcomes and lessons learned?",
    "19. What are the potential obstacles or challenges that might arise in solving this problem?",
    "20. Are there any relevant data or information that can provide insights into the problem? If yes, what data sources are available, and how can they be analyzed?",
    "21. Are there any stakeholders or individuals who are directly affected by the problem? What are their perspectives and needs?",
    "22. What resources (financial, human, technological, etc.) are needed to tackle the problem effectively?",
    "23. How can progress or success in solving the problem be measured or evaluated?",
    "24. What indicators or metrics can be used?",
    "25. Is the problem a technical or practical one that requires a specific expertise or skill set? Or is it more of a conceptual or theoretical problem?",
    "26. Does the problem involve a physical constraint, such as limited resources, infrastructure, or space?",
    "27. Is the problem related to human behavior, such as a social, cultural, or psychological issue?",
    "28. Does the problem involve decision-making or planning, where choices need to be made under uncertainty or with competing objectives?",
    "29. Is the problem an analytical one that requires data analysis, modeling, or optimization techniques?", 
    "30. Is the problem a design challenge that requires creative solutions and innovation?",
    "31. Does the problem require addressing systemic or structural issues rather than just individual instances?",
    "32. Is the problem time-sensitive or urgent, requiring immediate attention and action?",
    "33. What kinds of solution typically are produced for this kind of problem specification?",
    "34. Given the problem specification and the current best solution, have a guess about other possible solutions.",
    "35. Let's imagine the current best solution is totally wrong, what other ways are there to think about the problem specification?",
    "36. What is the best way to modify this current best solution, given what you know about these kinds of problem specification?",
    "37. Ignoring the current best solution, create an entirely new solution to the problem.",
    "39. Let's make a step by step plan and implement it with good notation and explanation."
  ];

  const taskExample = "Lisa has 10 apples. She gives 3 apples to her friend and then buys 5 more apples from the store. How many apples does Lisa have now?";

  const selectedModules = await selectReasoningModules(taskExample, reasoningModules);
  console.log("Stage 1 SELECT: Selected Modules:\n", selectedModules);

  const adaptedModules = await adaptReasoningModules(selectedModules, taskExample);  
  console.log("\nStage 1 ADAPT: Adapted Modules:\n", adaptedModules);

  const reasoningStructure = await implementReasoningStructure(adaptedModules, taskExample);
  console.log("\nStage 1 IMPLEMENT: Reasoning Structure:\n", reasoningStructure);

  const result = await executeReasoningStructure(reasoningStructure, taskExample);
  console.log("\nStage 2: Final Result:\n", result);
}

main();