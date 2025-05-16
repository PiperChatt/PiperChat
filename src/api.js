import axios from "axios";

const serverApi = "http://192.168.0.77:5002/api";

export const getTURNCredentials = async () => {
  try {
    const response = await axios.get(`${serverApi}/get-turn-credential`);
    return response.data;
  } catch (error) {
    return null;
  }
};
