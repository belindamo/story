// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');
import { Thought } from './lib/thoughtstream';

window.onload = () => {

  contextBridge.exposeInMainWorld('api', {
    reload: () => ipcRenderer.invoke('reload'),
    // index
    saveName: (name: string) => {
      ipcRenderer.send('saveName', name);
    },
    saveLearningPath: (path: string) => {
      ipcRenderer.send('saveLearningPath', path);
    },
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
    saveSources: (sources: string[]) => ipcRenderer.invoke("saveSources", sources),
    getUserInfo: () => ipcRenderer.invoke('getUserInfo'),
    generateMaterials: (sources: string[], notes: string, nCards: number) => ipcRenderer.invoke('generateMaterials', sources, notes, nCards),
    getQAPairsFromMarkdown: (targetFileName: string) => ipcRenderer.invoke('getQAPairsFromMarkdown', targetFileName),
    saveModifiedCards: (targetFile: string, qaPairs: {question: string, answer: string}[]) => ipcRenderer.invoke('saveModifiedCards', targetFile, qaPairs),
    sync: () => ipcRenderer.invoke('sync'),
    
    // convo
    addThought: (t: Thought) => {
      ipcRenderer.invoke('addThought', t);
    }
  });

}