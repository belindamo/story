import { get } from "jquery";
import { getWikiTitle } from "./utils";
const axios = require('axios');
const fs = require('fs');

const URL = "https://en.wikipedia.org/w/api.php";

// https://www.mediawiki.org/wiki/Extension:TextExtracts
const PARAMS = {
    "action": "query",
    'prop': 'extracts',
    "format": "json",
    'explaintext': true,
    "titles": "Earth",
};

// const userUrl = 'https://en.wikipedia.org/wiki/Planet_Earth_(disambiguation)#See_also'

export const getWikiData = async (userUrl: string) => {
  const pageTitle = getWikiTitle(userUrl);
  if (!pageTitle) throw Error('Incorrectly formatted wiki url');
  console.log(`Extracted page title: ${pageTitle}`);
  PARAMS.titles = pageTitle;

  try {
    const { data } = await axios.get(URL, { params: PARAMS })
    // Write the data to a file
    // fs.writeFile("wiki_data_j.json", JSON.stringify(data, null, 2), (err) => {
    //     if (err) {
    //         console.error(err);
    //         return;
    //     }
    //     console.log("Data written to file");
    // });
  
    const pageId = Object.keys(data.query.pages)[0];
    const extract = data.query.pages[pageId].extract;
    return extract;
  } catch (e) {
    console.error(e);
  }

}


