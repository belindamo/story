import '../styles/index.css';
import $ from 'jquery';
import { getWikiTitle, debounce } from '../lib/utils';

let name: string;
let learningFolder: string;
let sources: string[] = []; // Array of original filepaths or urls
let nCards = 8;

let userNotes: string | null = null;
let notesFilePath: string | null = null;
let isGenerating = false; 

// logic for modifying cards
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
  '#notes': '#generate',
  '#generate': '#modify'
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
  const handleKeydown = async (e) => {
    const startSection = currSection;
    const key = e.key;
    console.log(`"${key}"`)
    
    if (key === 'Enter' && currSection==='#home-2') {
      goToSection(map['#home-2']);
    } else if (currSection === '#upload') {
      if (key === 'v' && e.metaKey && !$('#wiki-url').is(':focus')) pasteWikiUrl();
      else if (key === 'Enter') {
        if (e.metaKey) {
          handleUploadNext();
        } else {
          if ($('#wiki-url').is(':focus')) {
            const wikiUrl =  $('#wiki-url').val() as string;
            if (getWikiTitle(wikiUrl)) {
              addSources([wikiUrl]);
              $('#wiki-url').val('');
            } 
          } else {
            await handleUploadFiles();
          }
        }
      }
    } else if (key==='Enter' && currSection==='#notes') {
      if (e.metaKey) {
        goToSection(map['#notes']);
        await loadGenerate();
      } else if (!$('#notes-prompt').is(':focus')) {
        $('#notes-prompt').trigger('focus');
        e.preventDefault();
      }
    } else if (e.metaKey && key === 'Enter' && currSection==='#generate') {
      goToModify();
    } else if (currSection === '#modify') {
      if (e.metaKey) {
        if (key === 'ArrowLeft') {
          if (e.shiftKey) {
            handleModifyBack();
          } else {
            handleModifyPrev();
          }
        }
        else if (key === 'ArrowRight') handleModifyNext();
        else if (key === 'ArrowDown') handleModifyDelete();
        else if (key === 's') handleModifySave();
        else if (key === 'Enter') handleModifyDone();
        else if (key === 'n') handleModifyNew();
        else if (key === 'k') handleModifyGen();
        else if  (key === 'K') handleModifyGenChildren();
        
      } else if (key === 'Enter' && !$('#modify-card-question').is(':focus') && !$('#modify-card-answer').is(':focus')) {
        $('#modify-card-question').trigger('focus');
      }

    } 

    if (startSection !== '#modify') {
      if (key==='ArrowLeft' && e.metaKey) {
        goBack();
      } else if (key==='ArrowRight' && e.metaKey) {
        goForward();
      }
    }
    
  }
  window.addEventListener('keydown', debounce(handleKeydown, 15));

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

  const handleUploadNext = async () => {
    // @ts-ignore
    const status = await window.api.saveSources(sources);
    if (status !== 'success') throw Error(status);
    const wikiUrl = $('#wiki-url').val() as string;
    if (getWikiTitle(wikiUrl)) addSources([wikiUrl]);
    goToSection(map['#upload']);
  }

  const handleUploadFiles = async () => {
    // @ts-ignore
    const filePaths = await window.api.openFiles();
    if (filePaths) {
      addSources(filePaths);
      $('#upload-next').removeClass("hidden");
    }
  }

  // Add local files
  $('#upload-files').on('click', handleUploadFiles);

  // Upload file
  $('#upload-next').on('click', handleUploadNext);

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
    nCards = $(this).val() as number;
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
      isGenerating = true;
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
      if (filename) { // generateMaterials returns empty object
        $('#generate-header').text('done!');
        
        $('#generate-status').text(`flashcard is written at ${filename}`);
        $('#generate-interims').html(`${filename}\n${metadata}\n${qaPairs}`.replace(/\n/g, '<br>'));
        
        // Update the current target file for modifying cards
        currTargetFile = filename;
        isGenerating = false;
      } else {
        throw Error('Error generating materials');
      }

    } catch(e) {
      $('#generate-header').text('oops, looks like something went wrong! check your inputs / internet connection, or message belinda');
      $('#generate-status').text('');
      console.error(e);
    }

  };

  $('#back-home').on('click', () => { 
    // @ts-ignore
    window.api.reload();
  });

  
  const handleCardModification = async () => {
    if (!isGenerating) {
      await loadCardForModification();
    }
  };
  
  const goToModify = async () => {
    goToSection(map['#generate']);
    await handleCardModification();
  };

  $('#go-to-modify').on('click', goToModify);

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

const handleModifyNext = async () => {
  // save current changes before updating index
  updaterCurrCard();
  
  currCardIndex++;
  if (currCardIndex >= currCards.length) {
    currCardIndex = 0;
  }
  updateModifiedCard();
}

const handleModifyPrev = async () => {
  // save current changes before updating index
  updaterCurrCard()

  currCardIndex--;
  if (currCardIndex < 0) {
    currCardIndex = currCards.length - 1;
  }
  updateModifiedCard();
}

const handleModifyDelete = async () => {
  if (currCards.length > 1) {
    currCards.splice(currCardIndex, 1);
    if (currCardIndex >= currCards.length) {
      currCardIndex = currCards.length - 1;
    } 
    updateModifiedCard();
  } else {
    currCards = [];
    handleModifyNew();
  }
};

const handleModifySave = async () => {
  updaterCurrCard(); // update current changes before saving

  // @ts-ignore
  const status: Boolean = await window.api.saveModifiedCards(currTargetFile, currCards);

  // Save the original button text
  const originalText = $("#modify-save-span").text();
          
  // Change the button text to "saved"
  $("#modify-save-span").text("saved");
  
  // Set a timeout to change the button text back after 5 seconds
  setTimeout(() => {
    $("#modify-save-span").text(originalText);
  }, 1500);
  
};

const handleModifyDone = async () => {
  // @ts-ignore
  await window.api.saveModifiedCards(currTargetFile, currCards)
  // @ts-ignore
  await window.api.reload();
};

const handleModifyNew = () => {
  currCards.push({question: '', answer: ''});
  currCardIndex = currCards.length - 1;
  updateModifiedCard();
};

const handleModifyBack = goBack;

const handleModifyGen = async () => {

};

const handleModifyGenChildren = async () => {

};

$('#modify-next').on('click', handleModifyNext);
$('#modify-prev').on('click', handleModifyPrev);
$("#modify-delete").on('click', handleModifyDelete);
$("#modify-save").on('click', handleModifySave);
$("#modify-done").on('click', handleModifyDone);
$("#modify-new").on('click', handleModifyNew);
$("#modify-back").on('click', handleModifyBack);

$("#modify-generate").on('click', handleModifyGen);
$("#modify-children").on('click', handleModifyGenChildren);


const textareas: HTMLTextAreaElement[] = [
  document.getElementById('modify-card-question') as HTMLTextAreaElement,
  document.getElementById('modify-card-answer') as HTMLTextAreaElement,
  document.getElementById('notes-prompt')  as HTMLTextAreaElement
];

function adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(64, textarea.scrollHeight)}px`;
}

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
