import axios from "axios";

const serverApi = "http://0.0.0.0:5002/api";

export const getTURNCredentials = async () => {
  try {
    const response = await axios.get(`${serverApi}/get-turn-credential`);
    return response.data;
  } catch (error) {
    return null;
  }
};
