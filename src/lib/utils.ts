import axios from 'axios';

export const getPathInfo = (path: string) => {
    try {
        const pathParts = path.split(/[/\\]/);
        const filename = pathParts.pop();
        return {
            parts: pathParts,
            filename: filename,
            folder: path.substring(0, path.lastIndexOf(filename))
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

