import axios from 'axios'

const serverApi = 'http://192.168.0.10:5002/api'


export const getTURNCredentials = async () => {
  const response = await axios.get(`${serverApi}/get-turn-credential`)
  return response.data
}