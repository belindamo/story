
export async function GetTextFromPDF(path: string): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    const doc = await pdfjsLib.getDocument(path).promise;
    const page1 = await doc.getPage(1);
    const content = await page1.getTextContent();
    const strings = content.items.map(function(item: any) {
        return item.str;
    });
    return strings.join('\n');
}

