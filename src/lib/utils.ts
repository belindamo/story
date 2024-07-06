import axios from 'axios';

export const getPathInfo = (path: string) => {
    try {
        const pathParts = path.split(/[/\\]/);
        const filenameWithExt = pathParts.pop();
        const filename = filenameWithExt.split('.').slice(0, -1).join('.');
        const extension = filenameWithExt.split('.').pop();
        return {
            parts: pathParts,
            filename: filename,
            extension: extension,
            folder: path.substring(0, path.lastIndexOf(filenameWithExt))
        };
    } catch(e) {
        return null;
    }
};
    
export const GetTextFromPDF = async (path: string): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    const doc = await pdfjsLib.getDocument(path).promise;
    const numPages = doc.numPages;
    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(function(item: any) {
            return item.str;
        }).join('\n');
        fullText += pageText + '\n';
    }
    return fullText;
};


export const getWikiTitle = (url: string) => {
    try {
        return url.split('/wiki/')[1].split(/[?/#]/)[0];
    } catch(e) {
        return null;
    }
};


export const getWikiData = async (userUrl: string) => {
    const apiUrl = 'https://en.wikipedia.org/w/api.php';
    const pageTitle = getWikiTitle(userUrl);
    if (!pageTitle) throw Error('Incorrectly formatted wiki url');
    console.log(`Extracted page title: ${pageTitle}`);

    // https://www.mediawiki.org/wiki/Extension:TextExtracts
    const params = {
        "action": "query",
        'prop': 'extracts',
        "format": "json",
        'explaintext': true,
        "titles": pageTitle,
    };

    try {
        const { data } = await axios.get(apiUrl, { params: params })
        const pageId = Object.keys(data.query.pages)[0];
        const extract = data.query.pages[pageId].extract;
        return extract;
    } catch (e) {
        console.error(e);
    }

}

export const getMetadata = (sources: string[]) => `---
sources: [ ${sources.join(', ')} ]
---

`;

export const debounce = (func: Function, wait: number, immediate = true) => {
    let timeout: any;
  
    return function (...args: any[]) {
      return new Promise((resolve, reject) => {
        const later = () => {
          timeout = null;
          if (!immediate) {
            func.apply(this, args).then(resolve).catch(reject);
          }
        };
  
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
  
        if (callNow) {
          func.apply(this, args).then(resolve).catch(reject);
        }
      });
    };
  };
