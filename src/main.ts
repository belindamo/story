import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { Document, VectorStoreIndex } from 'llamaindex';
import { sendMessageToGemini } from './lib/gemini';
import { srPrompt } from './lib/prompts';
import { GetTextFromPDF } from './lib/utils';
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
import { getWikiData } from './lib/wikipedia';
import { getWikiTitle } from './lib/utils';
import { Thought, ThoughtStream } from './lib/thoughtstream';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    maxWidth: 800,
    minHeight: 600,
    maxHeight: 600,
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
  let thoughtstream = new ThoughtStream();

  const userDataPath = path.join(app.getPath('userData'), 'user_data.json');

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

  ipcMain.handle('saveSourceFile', async (event, sourceFileName: string, sourceFileFolder: string) => {
    try {
      const sourcesFolderPath = getLearningPath() + '/sources';
      if (!fs.existsSync(sourcesFolderPath)) {
        fs.mkdirSync(sourcesFolderPath);
      }
      const source = sourceFileFolder + sourceFileName;
      const target = sourcesFolderPath + '/' + sourceFileName;
      await fs.promises.copyFile(
        source, 
        target,
        fs.promises.constants.COPYFILE_EXCL,
      )
      .catch((err) => {
        if (err) {
          console.error(err)
          return `error: ${err}`;
        } 
      });
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

  const getFileText = async (sourceFileName: string) => {
    const path = getLearningPath() + '/sources/' + sourceFileName;
    let material: string;
    if (sourceFileName.endsWith('.pdf')) {
      // Process PDF file
      material = await GetTextFromPDF(path);
    } else if (sourceFileName.endsWith('.txt') || sourceFileName.endsWith('.md')) {
      // Read text file or markdown file
      material = await fs.promises.readFile(path, 'utf-8');
    } else {
      throw new Error('Unsupported file type');
    }
    return material;
  }

  ipcMain.handle('generateMaterials', async (event, path: string, userPrompt: string = null, notesFilePath: string = null, isFile: boolean = true) => {
    try {
      let material;
      let flashcardFileName;
      console.log('abacadabra', 'path', path, 'userprompt', userPrompt, 'notes', notesFilePath, 'isfile', isFile)
      if (isFile) {
        material = await getFileText(path);
        flashcardFileName = path.replace(/\.[^/.]+$/, "") + '.md';
      } else {
        material = await getWikiData(path);
        flashcardFileName = getWikiTitle(path) + '.md';
      }

      let notes: string | null = null;
      if (notesFilePath) {
        if (notesFilePath.endsWith('.pdf')) {
          // Process PDF file
          notes = await GetTextFromPDF(notesFilePath);
        } else if (notesFilePath.endsWith('.txt') || notesFilePath.endsWith('.md')) {
          // Read text file or markdown file
          notes = await fs.promises.readFile(notesFilePath, 'utf-8');
        } else {
          throw new Error('Unsupported file type');
        }
      }

      // console.log('material', material);
      // console.log('notes', material);
      const prompt = srPrompt(material, userPrompt, notes);
      // console.log('PROMPT: ', prompt);

      let qaPairs = '';
      await sendMessageToGemini(prompt, (chunk: string) => {
        console.log(chunk);
        qaPairs += chunk;
      });

      const flashcardPath = getLearningPath() + '/flashcards'
      if (!fs.existsSync(flashcardPath)) {
        fs.mkdirSync(flashcardPath);
      }
      
      fs.writeFileSync(flashcardPath + '/' + flashcardFileName, qaPairs)
      return qaPairs;
       
    } catch(e) {
      console.error(e);
    }

  });

  ipcMain.handle('sync', async (cards) => {

    let card: Card = createEmptyCard();
    const f: FSRS = new FSRS(); 
    let scheduling_cards: RecordLog = f.repeat(card, new Date());

    const good: RecordLogItem = scheduling_cards[Rating.Good];
    const newCard: Card = good.card;

    console.log(card)
    console.log(f)
    console.log(scheduling_cards)
    console.log(good)
    console.log(newCard)

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
