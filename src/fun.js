import axios from 'axios';

export async function getRandomDadJoke () {
  const jokeData = await getUrl('https://icanhazdadjoke.com/');
  return jokeData?.joke || "";
}

export async function getCat () {
  const catData = await getUrl('https://cataas.com/cat');
  return catData?.url || "";
}

async function getUrl(url) {
  const options = {
    url: url,
    headers: {
      Accept: 'application/json',
    },
  };
  try {
    const response = await axios(options);
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}