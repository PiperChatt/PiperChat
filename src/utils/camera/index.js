export async function getCameraResolutions() {
  try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
          console.log("Nenhuma câmera encontrada.");
          return;
      }

      const cameraResolutions = [];

      for (const device of videoDevices) {
          const constraints = { video: { deviceId: device.deviceId } };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          const track = stream.getVideoTracks()[0];

          const capabilities = track.getCapabilities();
          if (capabilities.width && capabilities.height) {
              cameraResolutions.push({
                  deviceName: device.label || 'Camera sem nome',
                  resolutions: {
                      width: capabilities.width,
                      height: capabilities.height
                  }
              });
          }

          // Pare o fluxo após capturar as capacidades
          track.stop();
      }

      console.log(cameraResolutions);
      return cameraResolutions;
  } catch (error) {
      console.error("Erro ao obter resoluções da câmera:", error);
  }
}

export async function testCameraResolutions() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            console.log("Nenhuma câmera encontrada.");
            return;
        }

        const supportedResolutions = [];
        const resolutionsToTest = [
            { width: 2304, height: 1536 },
            { width: 1920, height: 1080 },
            { width: 1280, height: 720 },
            { width: 640, height: 480 },
            { width: 320, height: 240 },
            { width: 160, height: 120 }
        ];

        const device = devices[0]
        console.log(`Testando resoluções para: ${device.label || "Câmera sem nome"}`);
        for (const resolution of resolutionsToTest) {
            const constraints = {
                video: {
                    deviceId: device.deviceId,
                    width: { exact: resolution.width },
                    height: { exact: resolution.height }
                }
            };

            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                supportedResolutions.push({
                    device: device.label || "Câmera sem nome",
                    resolution: `${resolution.width}x${resolution.height}`,
                    supported: true
                });
                stream.getTracks().forEach(track => track.stop());
            } catch (error) {
                supportedResolutions.push({
                    device: device.label || "Câmera sem nome",
                    resolution: `${resolution.width}x${resolution.height}`,
                    supported: false
                });
            }
        }

        console.table(supportedResolutions);
        return supportedResolutions;
    } catch (error) {
        console.error("Erro ao testar resoluções:", error);
    }
}
