import axios from 'axios'

const serverApi = 'http://localhost:5002/api'


export const getTURNCredentials = async () => {
  const response = await axios.get(`${serverApi}/get-turn-credential`)
  return response.data
}
