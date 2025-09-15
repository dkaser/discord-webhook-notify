import { jest } from "@jest/globals";

jest.unstable_mockModule('axios', () => ({
  default: jest.fn(),
}));

const { default: axios } = await import('axios');
const { getRandomDadJoke } = await import('../src/joke');

describe('getRandomDadJoke', () => {
  it('returns a joke when API call is successful', async () => {
    axios.mockResolvedValue({ status: 200, data: { joke: 'Funny dad joke!' } });
    const joke = await getRandomDadJoke();
    expect(joke).toBe('Funny dad joke!');
  });

  it('returns empty string when API call fails', async () => {
    axios.mockRejectedValue(new Error('Network error'));
    const joke = await getRandomDadJoke();
    expect(joke).toBe('');
  });

  it('returns empty string when status is not 200', async () => {
    axios.mockResolvedValue({ status: 404, data: {} });
    const joke = await getRandomDadJoke();
    expect(joke).toBe('');
  });
});
