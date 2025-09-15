import axios from 'axios';

export async function getRandomDadJoke () {
  const options = {
    url: 'https://icanhazdadjoke.com/',
    headers: {
      Accept: 'application/json',
    },
  };
  try {
    const response = await axios(options);
    if (response.status === 200) {
      return response.data.joke;
    }
    return "";
  } catch {
    return "";
  }
}