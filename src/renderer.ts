/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';


console.log('👋 This message is being logged by "renderer.ts", included via Vite');


import { ipcRenderer } from 'electron';
import $ from "jquery";
import { FINISH, DIALOGUE_CONTENT, EPILOGUES } from './dialogue';
import type { TextNode, TextOption } from './dialogue';

/*~~ Set up game logic ~~*/
const LOADING = 0;
const TITLE = 1;
const DIALOGUE = 2;
const EPILOGUE = 3;

let state = {
  gameStage: LOADING,
  loadingText: false,
  epilogue: null as number | null,
  talkingAudio: new Audio(),
}

function startGame() {
  state.gameStage = DIALOGUE;
  showGameStage();
  showDialogue(1);

  window.api.saveText("Hello world!!!!")
}


function showDialogue(textNodeIndex: number) {
  const dialogue = DIALOGUE_CONTENT;
  const textNode: TextNode | undefined = dialogue.find((textNode) => textNode.id === textNodeIndex);
  if (textNode === undefined) {
    throw Error("Text node not found");
  }

  $("#character-portrait").css(
    "background-image",
    `url('${textNode.characterImg[0]}')`
  );
  
  $("#character-portrait").css(
    "background-position-x",
    textNode.characterImg[1] + "px"
  );

  $("#responses").empty(); // reset
  $("#progress-dialogue").addClass("hidden");

  // If displaying a dialogue object with options to show on the screen
  if (textNode.options) {
    textNode.options.forEach((option) => {
      const button = document.createElement("button");
      button.innerText = option.text;
      button.addEventListener("click", () => selectOption(option));
      $("#responses").append(button);
    });
  }

  // If displaying a dialogue object with text and speaker content
  if (textNode.speakerName && textNode.text) {
    $("#speaker-name").text(textNode.speakerName);
    $("#character-dialogue").empty();

    state.loadingText = true;
    state.talkingAudio.play()
    .then(() => {
      // Audio is playing.
    })
    .catch(error => {
      console.log(error);
    });
    const textArray = textNode.text.split("");
    let timeouts: NodeJS.Timeout[] = [];

    textArray.forEach((letter, index) => {
      timeouts.push(
        setTimeout(() => {
          $("#character-dialogue").append(letter);
        }, 20 * index)
      );
    });

    timeouts.push(
      setTimeout(
        () => finishLoadingDialogue(textNode),
        20 * (textArray.length - 1)
      )
    );

    document.body.onkeyup = function (e) {
      if (e.code == "Space" || e.code == "Enter") {
        clearTimeouts(timeouts, textNode);
      }
    };

    $(".dialogue-wrapper").on('click', function () {
      clearTimeouts(timeouts, textNode);
    });
  }
}

function clearTimeouts(timeouts: NodeJS.Timeout[], textNode: TextNode) {
  if (state.loadingText) {
    timeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    if (textNode.text !== undefined) {
      $("#character-dialogue").html(textNode.text);
    }
    finishLoadingDialogue(textNode);
  }
}

function finishLoadingDialogue(textNode: TextNode) {
  state.loadingText = false;
  state.talkingAudio.pause();
  $("#progress-dialogue").removeClass("hidden");

  document.body.onkeyup = function (e) {
    if (e.code == "Space" || e.code == "Enter") {
      advance(textNode);
    }
  };
  $("#progress-dialogue").on('click', function (event) {
    event.stopPropagation();
    advance(textNode);
  });
  $(".dialogue-wrapper").on('click', function () {
    advance(textNode);
  });
}

function clearListeners() {
  document.body.onkeyup = null;
  $("#progress-dialogue").off("click");
  $(".dialogue-wrapper").off("click");
}

function advance(textNode: TextNode) {
  clearListeners();
  if (textNode.next == FINISH) {
    showEpilogue();
  } else if (textNode.next !== undefined) {
    showDialogue(textNode.next);
  } else {
    throw Error("textNode must contain 'next' field in order to proceed")
  }
}

function selectOption(option: TextOption) {
  if (option.setState) {
    state = Object.assign(state, option.setState);
  }
  // option.chatMoods?.forEach((chatMood) => {
  //   showChat(chatMood);
  // });
  showDialogue(option.nextText);
}

function showGameStage() {
  $("#loading").addClass("hidden");
  $("#titlescreen").addClass("hidden");
  $("#dialogue-container").addClass("hidden");
  $("#epilogue").addClass("hidden");
  switch (state.gameStage) {
    case LOADING:
      $("#loading").removeClass("hidden");
      break;
    case TITLE:
      $("#titlescreen").removeClass("hidden");
      break;
    case DIALOGUE:
      $("#dialogue-container").removeClass("hidden");
      break;
    case EPILOGUE:
      $("#epilogue").removeClass("hidden");
      break;
  }
}

function showEpilogue() {
  state.gameStage = EPILOGUE;
  showGameStage();
  const epilogueObject = EPILOGUES.find(
    (epilogue) => epilogue.id === state.epilogue
  );
  if (epilogueObject === undefined) {
    throw Error("Epilogue object is undefined");
  }
  $("#epilogue-result").text(epilogueObject.text);
}

function restartGame() {
  state.gameStage = DIALOGUE;
  showGameStage();
  showDialogue(1);
}

/*~~ Run preloading ~~*/

window.addEventListener('load', () => {
  state.gameStage = TITLE;
  state.talkingAudio.loop = true;
  state.talkingAudio.src = "./src/assets/typing.mp3";
  $(".loading-dots").addClass("hidden");
  showGameStage();
  
  $("#begin").on("click", startGame);
  $("#play-again").on("click", restartGame);

  $("#titlescreen").on("click", (e) => {
    const button = $("<button>").text("Play");
    button.css({
      position: "absolute",
      left: e.pageX + "px",
      top: e.pageY + "px",
      transform: "translate(-50%, -50%)"
    });
    $("body").append(button);
  });
});
