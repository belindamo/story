// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

const preloadAssets = () => {
  // Image assets
  const imgChar1 = "./src/assets/clampy_sprites.png";
  
  const imageSrcs: string[] = [
    imgChar1
  ];
  let imagesAreLoaded = false;
  
  // Sound assets
  const snd1 = "./src/assets/typing.mp3";
  const soundSrcs: string[] = [snd1];
  let soundsAreLoaded = false;
  
  /*~~ Preload assets ~~*/
  let preloadedImages: { [key: string]: HTMLImageElement } = {};
  let preloadedSounds = {};
  
  let imagesLoaded = 0;
  const totalImages = imageSrcs.length;
  imageSrcs.forEach((imgUrl) => {
    var img = new Image();
    img.src = imgUrl;
    
    img.onload = (e) => {
      imagesLoaded++;
      preloadedImages[imgUrl] = img;
      if (imagesLoaded === totalImages) {
        imagesAreLoaded = true;
        if (imagesAreLoaded && soundsAreLoaded) {
          contextBridge.exposeInMainWorld('assets', { images: preloadedImages, sounds: preloadedSounds })
        }
      }
    };
  });
  
  let soundsLoaded = 0;
  const totalSounds = soundSrcs.length;
  soundSrcs.forEach((filename) => {
    var audio = new Audio(filename);
  
    audio.addEventListener("canplaythrough", () => {
      soundsLoaded++;
      if (soundsLoaded === totalSounds) {
        soundsAreLoaded = true;
        if (imagesAreLoaded && soundsAreLoaded) {
          contextBridge.exposeInMainWorld('assets', { images: preloadedImages, sounds: preloadedSounds })
        }
      }
    });
  });


}  

window.onload = () => {
  preloadAssets();

  contextBridge.exposeInMainWorld('api', {
    saveText: (text: string) => {
      ipcRenderer.send("saveText", text);
    }
  });

}