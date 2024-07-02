import '../styles/index.css';
import $ from 'jquery';
import { getWikiTitle } from '../lib/utils';

let name: string;
let learningFolder: string;
let sources: string[] = []; // Array of original filepaths or urls
let nCards = 8;

let userNotes: string | null = null;
let notesFilePath: string | null = null;

//logic for modifying cards
let currTargetFile: string;
let currCards: {question: string, answer: string}[] = [];
let currCardIndex = 0;

/* ~~~~~ MAP ~~~~~ */
let currSection: string;
const map = {
  '#home': '#save-folder',
  '#save-folder': '#upload',
  '#home-2': '#upload',
  '#upload': '#notes',
  '#notes': '#generate'
};
let paths: string[] = [];
let pathI = -1;

function goToSection(section: string) {
  $(currSection).addClass('hidden');
  $(section).removeClass('hidden');
  pathI++;
  paths[pathI] = section;
  paths = paths.slice(0, pathI + 1);
  currSection = section;
}

function goBack() {
  if (pathI > 0) {
    $(currSection).addClass('hidden');
    pathI--;
    currSection = paths[pathI];
    $(currSection).removeClass('hidden');
  }
}

function goForward() {
  if (paths.length > pathI + 1) {
    $(currSection).addClass('hidden');
    pathI++;
    currSection = paths[pathI];
    $(currSection).removeClass('hidden');
  }
}

window.addEventListener('load', async () => {
  // @ts-ignore
  const userInfo = await window.api.getUserInfo();
  console.log(userInfo);
  if (userInfo.name) name = userInfo.name;
  if (userInfo.learningPath) learningFolder = userInfo.learningPath;

  // ~~~ Keyboard shortcuts ~~~
  window.addEventListener('keydown', async (e) => {
    const key = e.key;
    console.log(`"${key}"`)
    
    if (key === 'Enter' && currSection==='#home-2') {
      goToSection(map['#home-2']);
    }

    if (currSection==='#upload') {
      // if (key === 'v' && e.metaKey && !$('#wiki-url').is(':focus')) pasteWikiUrl();
      // if (key === 'Enter') {
      //   wikiUrl =  $('#wiki-url').val() as string;
      //   if (getWikiTitle(wikiUrl) || !wikiUrl) {
      //     addSources([wikiUrl]);
      //     if (e.metaKey) {
      //       goToSection(map['#upload']);
      //     }
      //   } else {
      //     $('#upload-error').text('Please share a valid wiki link').removeClass('hidden');
      //   }

      // }
    }

    if (key==='Enter' && currSection==='#notes') {
      goToSection(map['#notes']);
      loadGenerate();
    }

    if (key==='ArrowLeft' && e.metaKey) {
      goBack();
    }
    if (key==='ArrowRight' && e.metaKey) {
      goForward();
    }
  });

  // ~~~ Navigate to Home or Home 2 ~~~
  if (userInfo.name && userInfo.learningPath) {
    goToSection('#home-2');
    $('#home-2-folder-path').text(userInfo.learningPath);
  } else {
    goToSection('#home');
    $('#your-name').trigger('focus');
  }

  // ~~~ Home Section for newcomers ~~~
  $('#your-name').on('keypress', (e) => {
    if (e.which === 13) {
      name = $('#your-name').val() as string;
      // @ts-ignore
      window.api.saveName(name);
      $('#upload-header').text(`hiya ${name}! ${$('#upload-header').text()}`);
      goToSection(map['#home'])
    }
    $(this).attr("disabled", "disabled");
  });

  // ~~~ Home 2 Section ~~~
  $('#add-materials').on('click', () => { goToSection(map['#home-2'])});

  // ~~~ Upload Section ~~~
  const addSources = (newSources: string[]) => {
    sources = [...new Set([...sources, ...newSources])];
    if (sources) {
      $('#upload-file-paths').html(
        '<ul>' +
          sources.map(source => `<li>${source}</li>`).join('') +
        '</ul>'  
      );
    }
  }

  const submitMaterials = async () => {
    // @ts-ignore
    const status = await window.api.saveSources(sources);
    if (status !== 'success') throw Error(status);
    const wikiUrl = $('#wiki-url').val() as string;
    if (wikiUrl && getWikiTitle(wikiUrl)) sources.push(wikiUrl);
    goToSection(map['#upload']);
  }

  // Add local files
  $('#upload-files').on('click', async () => {
    // @ts-ignore
    const filePaths = await window.api.openFiles();
    if (filePaths) {
      addSources(filePaths);
      $('#upload-next').removeClass("hidden");
    }
  })

  // Upload file
  $('#upload-next').on('click', submitMaterials);

  const pasteWikiUrl = async () => {
    const txt = await navigator.clipboard.readText();
    if (txt) $('#wiki-url').val(txt);
  }
  $('#paste').on('click', pasteWikiUrl);

  // ~~~ Notes Section ~~~
  $('#notes-files').on('click', async () => {
    // @ts-ignore
    const filePaths = await window.api.openFiles();
    if (filePaths) {
      notesFilePath = filePaths[0];
      console.log(notesFilePath);
      $('#notes-file-paths').text(notesFilePath);
    }
  });

  // Update number of cards when slider is released
  $('#n-cards').on('change', function() {
    const nCards = $(this).val() as number;
  });

  $('#notes-prompt').on('change', function() {
    userNotes = $(this).val() as string;
  });

  $('#notes-next').on('click', async () => {
    goToSection(map['#notes']);
    await loadGenerate();
  });

  // ~~~ Generate Section ~~~


  const loadGenerate = async () => {
    try {
      let flashcardPath;
      let animationInterval = setInterval(() => {
        const dots = $('#generate-header').text().split('.').length;
        if (dots > 3 || dots === 0) {
          $('#generate-header').text('spitting bars');
        } else {
          $('#generate-header').text($('#generate-header').text() + '.');
        }
      }, 500);

      $('#generate-status').text(`generating your flashcards! they'll appear in ${learningFolder}/flashcards`);
      
      // @ts-ignore
      const { filename, metadata, qaPairs } = await window.api.generateMaterials(sources, userNotes, nCards);
      
      clearInterval(animationInterval);
      $('#generate-header').text('done!');
      
      $('#generate-status').text(`flashcard is written at ${filename}`);
      $('#generate-interims').html(`${filename}\n${metadata}\n${qaPairs}`.replace(/\n/g, '<br>'));

      //Update the current target file for modifying cards
      currTargetFile = filename;
    } catch(e) {
      $('#upload-error').removeClass('hidden');
      console.error(e);
    }

  };

  $('#back-home').on('click', () => { goToSection('#home-2') });

  $('#add-another-deck').on('click', () => { goToSection('#upload') });


  $('#go-to-modify').on('click', async () => { 
    console.log('going to modify');
    goToSection('#modify')
    await loadCardForModification();
  
  });

  // ~~ Modify Cards Sections ~~

const updateModifiedCard = () => {
  $('#modify-card-question').val(currCards[currCardIndex].question);
  $('#modify-card-answer').val(currCards[currCardIndex].answer);
  $('#modify-card-index').text(`${currCardIndex + 1}/${currCards.length}`);

  // Update textareas heights`
  textareas.forEach(textarea => {
    adjustTextareaHeight(textarea);
  });
}

const loadCardForModification = async () => {
  // Read cards from markdown file
  // @ts-ignore
  const qaPairs = await window.api.getQAPairsFromMarkdown(currTargetFile);
  currCards = qaPairs;
  currCardIndex = 0;

  // Display the first card
  updateModifiedCard();
}

$('#modify-next').on('click', async () => {
  // save current changes before updating index
  updaterCurrCard()

  currCardIndex++;
  if (currCardIndex >= currCards.length) {
    currCardIndex = 0;
  }
  updateModifiedCard();
});

$('#modify-prev').on('click', async () => {
  // save current changes before updating index
  updaterCurrCard()

  currCardIndex--;
  if (currCardIndex < 0) {
    currCardIndex = currCards.length - 1;
  }
  updateModifiedCard();
});

$("#modify-delete").on('click', async () => {
  currCards.splice(currCardIndex, 1);
  if (currCardIndex >= currCards.length) {
    currCardIndex = currCards.length - 1;
  }
  updateModifiedCard();
})

$("#modify-save").on('click', async () => {
  updaterCurrCard(); // update current changes before saving

  // @ts-ignore
  const status: Boolean = await window.api.saveModifiedCards(currTargetFile, currCards);

  // TODO: Add a success message
})


$('#modify-back-home').on('click', () => { goToSection('#home-2') });

const textareas: HTMLTextAreaElement[] = [
  document.getElementById('modify-card-question') as HTMLTextAreaElement,
  document.getElementById('modify-card-answer') as HTMLTextAreaElement
];

function adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

function updaterCurrCard() {
  currCards[currCardIndex].question = $('#modify-card-question').val() as string;
  currCards[currCardIndex].answer = $('#modify-card-answer').val() as string;
}

// textarea height should be adjusted automatically based on content length
textareas.forEach(textarea => {
  textarea.addEventListener('input', () => {
      adjustTextareaHeight(textarea);
  });

  adjustTextareaHeight(textarea);
});



  // ~~~ Update Folder Section ~~~
  $('#update-folder').on('click', async () => {
    try {
        // @ts-ignore
        const path = await window.api.openFolder();
      if (learningFolder && path) {
        // @ts-ignore
        await window.api.saveLearningPath(path)
        learningFolder = path;
        $('#home-2-folder-path').text(learningFolder);
        $('#home-2-update-status').removeClass('hidden');
        $('#home-2-update-status').text(`success! updated folder path to "${learningFolder}"`);
        $('#home-2-error').addClass('hidden');      
      }
    } catch(e) {
      $('#home-2-error').removeClass('hidden');
      $('#home-2-error').text($('#home-2-error').text() + `\nerror: ${e}`)
    }
  })

  $('#save-folder-button').on('click', async () => {
    try {
      // @ts-ignore
      learningFolder = await window.api.openFolder();
      if (learningFolder) {
        $('#save-folder-path').text(learningFolder)
        $('#save-folder-next').removeClass('hidden');
      }
    } catch(e) {
      $('#save-folder-error').removeClass('hidden');
    }
  })

  $('#save-folder-next').on('click', () => {
    // @ts-ignore
    window.api.saveLearningPath(learningFolder)
    goToSection('#upload');
  });


});
