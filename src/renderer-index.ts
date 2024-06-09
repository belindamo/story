import './style.css';
import $ from 'jquery';

const SECTIONS: string[] = ['#home', '#home-2', '#upload', '#notes', '#save-folder', '#generate', '#learn'];

let name: string;
let learningFolder: string;
let sourceFileFolder: string = '';
let sourceFileName: string = '';
let userPrompt: string | null = null;
let notesFilePath: string | null = null;
// let sourceFilePaths: string[] = [];

function goToSection(section: string) {
  SECTIONS.forEach((s) => {
    if (s !== section && $(s).is(':visible')) {
      $(s).addClass('hidden');
    }
  })
  $(section).removeClass('hidden');
}


window.addEventListener('load', async () => {
  // @ts-ignore
  const userInfo = await window.api.getUserInfo();
  console.log(userInfo);
  if (userInfo.name) name = userInfo.name;
  if (userInfo.learningPath) learningFolder = userInfo.learningPath;

  // goToSection('#notes');
  if (userInfo.name && userInfo.learningPath) {
    goToSection('#home-2');
    $('#home-2-folder-path').text(userInfo.learningPath);
  } else {
    goToSection('#home');
  }

  // Ask for name
  $('#your-name').on('keypress', (e) => {
    if (e.which === 13) {
      name = $('#your-name').val() as string;
      // @ts-ignore
      window.api.saveName(name);
      $('#upload-header').text(`hello ${name}. ${$('#upload-header').text()}`);
      goToSection('#save-folder')
      // goToSection('#upload');
    }
    $(this).attr("disabled", "disabled");
  });

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

  $('#notes-files').on('click', async () => {
    // @ts-ignore
    const filePaths = await window.api.openFiles();
    if (filePaths) {
      notesFilePath = filePaths[0];
      console.log(notesFilePath);
      $('#notes-file-paths').text(notesFilePath);
    }
  });

  $('#notes-next').on('click', async () => {
    try {
      goToSection('#generate');
      const flashcardPath = `${learningFolder}/flashcards/${sourceFileName.replace(/\.[^/.]+$/, "") + '.md'}`;
      $('#generate-interims').text(`generating your flashcards! They'll appear at ${flashcardPath}`);

      userPrompt = $('#notes-prompt').val();
      console.log('generatinggg', sourceFileName, userPrompt, notesFilePath);

      // @ts-ignore
      const qaPairs: string = await window.api.generateMaterials(sourceFileName, userPrompt, notesFilePath);
      
      // $('#generate-status').text(`success! flashcard is written at ${flashcardPath}`);
      $('#generate-result').text(qaPairs);
      
      //   (chunk: string) => {
      //   response += chunk;
      //   $('#generate-interims').text(response);
      // });
    } catch(e) {
      $('#upload-error').removeClass('hidden');
    }

  });

  // Upload file
  $('#upload-next').on('click', async () => {
    // @ts-ignore
    const status = await window.api.saveSourceFile(sourceFileName, sourceFileFolder);
    console.log(status)
    
    goToSection('#notes');
  });

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

  $('#add-materials').on('click', () => { goToSection('#upload')});

  $('.back-home').on('click', () => { goToSection('#home-2') });

});
