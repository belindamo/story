// Here, we'll take inspiration from the Generative Agents paper! https://arxiv.org/abs/2304.03442

import fs from 'fs';

export type Thought = {
  role: string;
  content: string;
};

export class ThoughtStream {
  private thoughts: Thought[] = [];
  
  addThought(t: Thought) {
    this.thoughts.push(t);
    try {
      fs.promises.appendFile('./thoughtstream.md', `<${new Date().toLocaleString()}> ${t.role}: ${t.content}\n`);
    } catch (err) {
      console.error(`Error exporting thoughts to ./thoughtstream.md:`, err);
    }
  }

  getThoughts() {
    return this.thoughts;
  }

  clearThoughts() {
    this.thoughts = [];
  }

}