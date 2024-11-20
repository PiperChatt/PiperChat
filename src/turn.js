import * as api from './api'

let TURNIceServers = null

export const fetchTURNCredential = async () => {
  const responseData = await api.getTURNCredentials()

  if (responseData?.token?.iceServers) {
    console.log("TURN ICE Servers: ", responseData.token);
    TURNIceServers = responseData.token.iceServers
  }

  return TURNIceServers
}


export const getTurnIceServers = () => {
  return TURNIceServers
}
