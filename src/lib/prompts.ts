// export const srPromptPrep = () => `

// `;

// TODO: remove Example part. but maybe the student can add an example and then that can be used as the format
/*
  Example:
  Question should be: "What does '你好' mean?"
  Answer should be: Hello · nǐ hǎo · 你好吗？/ How are you? ? Nǐ hǎo ma
*/
export const srPrompt = (material: string, userPrompt: string = null, personalNotes: string = null) => {
  let prompt = 'You are a teacher.\n\n';

  prompt += `Based on the reference material below, please generate a series of questions and answers for spaced repetition notecards. They should be specific and faithful to the reference material. Question-answer pairs should be separated by two new lines. Generate question-answer pairs only. The format for each question-answer pair should be:

  <question>
  ?
  <answer>

  ${userPrompt ?? 'Focus the flashcards based on the user\'s motivations for learning, their goals, specific concepts/passages to focus on, and other notes:' + userPrompt}

  Reference material to convert into question-answer pairs:
  ${material}`;


  if (personalNotes) {
    prompt += `------------
    REFERENCE MATERIALS
    
    These are the notes the user has taken so far:
    ${personalNotes}
    ------------
    `
  }

  return prompt;
};