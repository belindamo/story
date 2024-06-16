// Pulled from this plugin:
// https://github.com/st3v3nmw/obsidian-spaced-repetition/blob/master/src/scheduling.ts

export interface SRSettings {
  // flashcards
  flashcardEasyText: string;
  flashcardGoodText: string;
  flashcardHardText: string;
  flashcardTags: string[];
  convertFoldersToDecks: boolean;
  cardCommentOnSameLine: boolean;
  burySiblingCards: boolean;
  showContextInCards: boolean;
  flashcardHeightPercentage: number;
  flashcardWidthPercentage: number;
  randomizeCardOrder: boolean;
  flashcardCardOrder: string;
  flashcardDeckOrder: string;
  convertHighlightsToClozes: boolean;
  convertBoldTextToClozes: boolean;
  convertCurlyBracketsToClozes: boolean;
  singleLineCardSeparator: string;
  singleLineReversedCardSeparator: string;
  multilineCardSeparator: string;
  multilineReversedCardSeparator: string;
  editLaterTag: string;
  // notes
  enableNoteReviewPaneOnStartup: boolean;
  tagsToReview: string[];
  noteFoldersToIgnore: string[];
  openRandomNote: boolean;
  autoNextNote: boolean;
  disableFileMenuReviewOptions: boolean;
  maxNDaysNotesReviewQueue: number;
  // UI preferences
  initiallyExpandAllSubdecksInTree: boolean;
  // algorithm
  baseEase: number;
  lapsesIntervalChange: number;
  easyBonus: number;
  maximumInterval: number;
  maxLinkFactor: number;
  // logging
  showDebugMessages: boolean;
}


export const DEFAULT_SETTINGS: SRSettings = {
  // flashcards
  flashcardEasyText: 'easy',
  flashcardGoodText: 'good',
  flashcardHardText: 'hard',
  flashcardTags: ["#flashcards"],
  convertFoldersToDecks: false,
  cardCommentOnSameLine: false,
  burySiblingCards: false,
  showContextInCards: true,
  flashcardHeightPercentage: 80,
  flashcardWidthPercentage: 40,
  randomizeCardOrder: null,
  flashcardCardOrder: "DueFirstRandom",
  flashcardDeckOrder: "PrevDeckComplete_Sequential",

  convertHighlightsToClozes: true,
  convertBoldTextToClozes: false,
  convertCurlyBracketsToClozes: false,
  singleLineCardSeparator: "::",
  singleLineReversedCardSeparator: ":::",
  multilineCardSeparator: "?",
  multilineReversedCardSeparator: "??",
  editLaterTag: "#edit-later",
  // notes
  enableNoteReviewPaneOnStartup: true,
  tagsToReview: ["#review"],
  noteFoldersToIgnore: [],
  openRandomNote: false,
  autoNextNote: false,
  disableFileMenuReviewOptions: false,
  maxNDaysNotesReviewQueue: 365,
  // UI settings
  initiallyExpandAllSubdecksInTree: false,
  // algorithm
  baseEase: 250,
  lapsesIntervalChange: 0.5,
  easyBonus: 1.3,
  maximumInterval: 36525, // in days
  maxLinkFactor: 1.0,
  // logging
  showDebugMessages: false,
};
