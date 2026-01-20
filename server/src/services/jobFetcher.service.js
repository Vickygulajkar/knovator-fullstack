const axios = require("axios");
const xml2js = require("xml2js");

async function fetchJobsFromAPI(url) {
    const response = await axios.get(url);

    const parsed = await xml2js.parseStringPromise(response.data, {
        explicitArray: false,
    });

    return parsed;
}

module.exports = { fetchJobsFromAPI };
