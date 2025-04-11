export function isOnlyAudioCall(stream) {
  try {
    return stream.getVideoTracks().length === 0;
  } catch (error) {
      throw new Error('[isOnlyAudioCall] Unable to check tracks')
  }
}
