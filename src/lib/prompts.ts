import p from './prompts/spacedRepetition';

export const promptGenerateCards = (flashcardName: string, materials: string[], userNote: string = null, nCards: number = null) => {
  let prompt = p;

  prompt = prompt.replaceAll('{{flashcardName}}', flashcardName);

  prompt = prompt.replaceAll('{{material}}', materials.join());
  
  if (userNote) {
    prompt = prompt.replaceAll('{{userNote}}', userNote);
  } else {
    prompt = prompt.replaceAll('{{userNote}}', '');
  }
  
  if (nCards) {
    prompt = prompt.replaceAll('{{nCards}}', nCards.toString());
  } else {
    prompt = prompt.replaceAll('{{nCards}}', '');
  }

  return prompt;
};