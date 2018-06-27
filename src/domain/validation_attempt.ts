// const checkVideoScreens2 = new ValidationBuilder("videoScreens", cb =>
//     cb.videoScreens.fold<Validation<string[], DesktopCapturerSource[]>>(
//         () => failure(["Not started looking for screens"]),
//         () => failure(["Looking for available screens..."]),
//         s => of(s),
//         () => failure(["Failed to find any screens"])
//     )
// );

// const checkAudioDevices2 = new ValidationBuilder("audioDevices", cb =>
//     cb.audioDevices.fold<Validation<string[], MediaDeviceInfo[]>>(
//         () => failure(["Not started looking for microphones"]),
//         () => failure(["Looking for available microphones..."]),
//         s => of(s),
//         () => failure(["Failed to find any microphones"])
//     )
// );
