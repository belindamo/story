import './style.css';
import $ from 'jquery';
import { getWikiTitle } from './lib/utils';
// SECTIONS: '#home', '#home-2', '#upload', '#notes', '#save-folder', '#generate', '#learn'

let name: string;
let learningFolder: string;
let sourceFileFolder: string | null = null;
let sourceFileName: string | null = null;
let userPrompt: string | null = null;
let notesFilePath: string | null = null;
// let sourceFilePaths: string[] = [];
let wikiUrl: string | null = null;

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
      if (key === 'v' && e.metaKey && !$('#wiki-url').is(':focus')) pasteWikiUrl();
      if (key === 'Enter') {
        if (e.metaKey) {
          wikiUrl = $('#wiki-url').val() as string;
          goToSection(map['#upload']);
        } else {
          $('#wiki-url').trigger('focus');
        }
      }
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
  }

  // ~~~ Home Section for newcomers ~~~
  $('#your-name').on('keypress', (e) => {
    if (e.which === 13) {
      name = $('#your-name').val() as string;
      // @ts-ignore
      window.api.saveName(name);
      $('#upload-header').text(`hello ${name}. ${$('#upload-header').text()}`);
      goToSection(map['#home'])
    }
    $(this).attr("disabled", "disabled");
  });

  // ~~~ Home 2 Section ~~~
  $('#add-materials').on('click', () => { goToSection(map['#home-2'])});

  // ~~~ Upload Section ~~~
  $('#upload-files').on('click', async () => {
    // @ts-ignore
    const filePaths = await window.api.openFiles();
    if (filePaths) {
      let pathParts = filePaths[0].split(/[/\\]/);
      sourceFileName = pathParts.pop();
      sourceFileFolder = filePaths[0].substring(0, filePaths[0].lastIndexOf(sourceFileName));
      console.log(sourceFileFolder, sourceFileName)
      $('#upload-file-paths').text(
        sourceFileFolder + sourceFileName
      );
      // source
      // for (const path of filePaths) {
        //   if (!sourceFilePaths.includes(path)) {
          //     sourceFilePaths.push(path);
      //   }
      // }
      // $('#upload-file-paths').text(
      //   sourceFilePaths.join('\n')
      // );
      $('#upload-next').removeClass("hidden");
    }
  })

  // Upload file
  $('#upload-next').on('click', async () => {
    // @ts-ignore
    // const status = await window.api.saveSourceFile(sourceFileName, sourceFileFolder);
    // console.log(status)
    wikiUrl = $('#wiki-url').val() as string;
    goToSection(map['#upload']);
  });

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
  
  const loadGenerate = async () => {
    try {
      userPrompt = $('#notes-prompt').val() as string;
      let flashcardPath;
      let qaPairs;
      if (sourceFileName) {
        flashcardPath = `${learningFolder}/flashcards/${sourceFileName.replace(/\.[^/.]+$/, "") + '.md'}`;
        // @ts-ignore
        qaPairs = await window.api.generateMaterials(sourceFileName, userPrompt, notesFilePath);
      } else { // wiki
        const wikiTitle = getWikiTitle(wikiUrl);
        flashcardPath = `${learningFolder}/flashcards/${wikiTitle}.md'}`;
        // @ts-ignore
        qaPairs = await window.api.generateMaterials(wikiUrl, userPrompt, notesFilePath, false);
      }
      $('#generate-interims').text(`generating your flashcards! They'll appear at ${flashcardPath}`);
      // $('#generate-status').text(`success! flashcard is written at ${flashcardPath}`);
      $('#generate-result').text(qaPairs);
      
      //   (chunk: string) => {
      //   response += chunk;
      //   $('#generate-interims').text(response);
      // });
    } catch(e) {
      $('#upload-error').removeClass('hidden');
      console.error(e);
    }

  };

  $('#notes-next').on('click', async () => {
    goToSection(map['#notes']);
    await loadGenerate();
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

  // ~~~ Bottom Nav Section ~~~
  $('.back-home').on('click', () => { goToSection('#home-2') });

});
