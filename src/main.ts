import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
const { updateElectronApp } = require('update-electron-app');

import path from 'path';
import fs from 'fs';
import { Document, VectorStoreIndex } from 'llamaindex';
import { sendMessageToGemini } from './lib/gemini';
import { promptGenerateCards } from './lib/prompts';
import { GetTextFromPDF, getMetadata } from './lib/utils';
import { 
  Card,
  createEmptyCard,
  generatorParameters,
  FSRSParameters,
  FSRS,
  fsrs,
  RecordLog,
  Rating
} from 'ts-fsrs';
import { getWikiTitle, getWikiData, getPathInfo } from './lib/utils';
import { Thought, ThoughtStream } from './lib/thoughtstream';

updateElectronApp(); // additional configuration options available

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  

  // this opens all <a> links with target "_blank" in the browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  return mainWindow;
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  const win = createWindow();
  win.once('ready-to-show', () => {
    win.webContents.setZoomFactor(0.8);
    win.show();
  })

  let thoughtstream = new ThoughtStream();

  const userDataPath = path.join(app.getPath('userData'), 'user_data.json');
  console.log(userDataPath);

  const saveUserData = (key: string, value: string) => {
    let data;
    if (fs.existsSync(userDataPath)) {
      data = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
      console.log('data', data)
    } else {
      data = {};
    }
    data[key] = value;
    console.log('new data', data)
    fs.writeFileSync(userDataPath, JSON.stringify(data));
  };

  const getLearningPath = (): string => {
    if (fs.existsSync(userDataPath)) {
      const { learningPath } = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
      return learningPath;
    }
    throw Error('Learning path is not in app userData');
  }

  ipcMain.handle('dialog:openFiles', async (event) => {
    try {
      let path;
      const { canceled, filePaths } = await dialog
        .showOpenDialog({
          properties: ["openFile", "multiSelections"]
        });
      if (!canceled) {
        return filePaths;
      }
    } catch(e) {
      console.error(e);
      return null;
    }
  })

  ipcMain.handle('dialog:openFolder', async (event) => {
    try {
      let path;
      const { canceled, filePaths } = await dialog
        .showOpenDialog({
            properties: ["openDirectory", "createDirectory"],
        });
      if (!canceled) {
        saveUserData('learningPath', path);
        return filePaths[0];
      }
    } catch(e) {
      console.error(e);
      return null;
    }
  });

  ipcMain.on('saveName', (event, name: string) => {
    saveUserData('name', name);
  });

  ipcMain.on("saveLearningPath", (event, path: string) => {
    saveUserData('learningPath', path);
  });

  ipcMain.handle('saveSources', async (event, sources: string[]) => {
    try {
      const targetFolder = getLearningPath() + '/sources';
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
      }
      let promises: Promise<void>[] = [];
      sources.forEach((source) => {
        if (!(getWikiTitle(source))) {
          const { folder, filename } = getPathInfo(source);
          const target = targetFolder + '/' + filename;
          promises.push(fs.promises.copyFile(
            source, 
            target,
            fs.constants.COPYFILE_FICLONE, // overwrites source file if it exists
          ));
        } else {
          throw Error(`Invalid source filepath: ${source}`);
        }
      })
      await Promise.all(promises);
      return 'success';
    } catch(e) {
      console.error(e);
      return `error: ${e}`;
    }
  });

  ipcMain.handle('getUserInfo', (event) => {
    let data = {};
    if (fs.existsSync(userDataPath)) {
      data = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
      console.log('data', data)
    } 
    return data;
  })

  const getFileText = async (path: string) => {
    let material: string;
    if (path.endsWith('.pdf')) {
      // Process PDF file
      material = await GetTextFromPDF(path);
    } else if (path.endsWith('.txt') || path.endsWith('.md')) {
      // Read text file or markdown file
      material = await fs.promises.readFile(path, 'utf-8');
    } else {
      throw new Error('Unsupported file type');
    }
    return material;
  }

  ipcMain.handle('generateMaterials', async (event, sources: string[], notes: string, nCards: number) => {
    try {
      let promises: Promise<string>[] = [];
      sources.forEach((source) => {
        const wikiTitle = getWikiTitle(source);
        if (wikiTitle) { // wiki url
          promises.push(getWikiData(source));
        } 
        if (getPathInfo(source)) { // local file
          promises.push(getFileText(source));
        }
      });

      let targetFilename = '';
      if (sources.length === 1) {
        if (getWikiData(sources[0])) {
          targetFilename = getWikiTitle(sources[0]) + '.md';
        } else {
          targetFilename = getPathInfo(sources[0]).filename + '.md';
        }
      } 

      const materials: PromiseSettledResult<string>[] = await Promise.allSettled(promises);
      const materialStrings = materials.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Error processing material: ${result.reason}`);
          return '';
        }
      });

      const prompt = promptGenerateCards(targetFilename, materialStrings, notes, nCards);
      // console.log('PROMPT: ', prompt);

      const qaPairs = await sendMessageToGemini(prompt);

      const flashcardPath = getLearningPath() + '/flashcards'
      if (!fs.existsSync(flashcardPath)) {
        fs.mkdirSync(flashcardPath);
      }

      if (sources.length > 1) {
        targetFilename = await sendMessageToGemini(`Return a markdown filename ONLY based on context below.
        Your example response 1: "Luis von Ahn.md"
        Your example response 2: "Augmenting Long Term Memory.md"
        Your example response 3: "How to Make Dalgona Coffee.md"
        ---
        Context: 
        ${qaPairs}
        ---
        `);
        targetFilename = targetFilename.trim().replace(/^[*_'\-"`?]+|[*_'\-"`?]+$/g, '');
      }
      const metadata = getMetadata(sources);
      console.log('targetfilename', targetFilename)
      console.log('meow', flashcardPath + '/' + targetFilename)
      
      await fs.promises.writeFile(flashcardPath + '/' + targetFilename, metadata + qaPairs)
      return targetFilename + '\n' + metadata + qaPairs;
       
    } catch(e) {
      console.error(e);
    }

  });

  ipcMain.handle('sync', (cards) => {

    // let card: Card = createEmptyCard();
    // const f: FSRS = new FSRS(); 
    // let scheduling_cards: RecordLog = f.repeat(card, new Date());

    // const good: RecordLogItem = scheduling_cards[Rating.Good];
    // const newCard: Card = good.card;

    // console.log(card)
    // console.log(f)
    // console.log(scheduling_cards)
    // console.log(good)
    // console.log(newCard)

    return [
      {
        front: 'This is the front of card 1',
        back: 'This is the back of card 1',
        interval: 1,
        ease: 250
      },
      {  
        front: 'This is the front of card 2',
        back: 'This is the back of card 2',
        interval: 1,
        ease: 250
      }
    ];
  });

  ipcMain.handle('addThought', (event, t: Thought) => {
    thoughtstream.addThought(t);
  })


});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
