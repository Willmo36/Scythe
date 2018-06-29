import * as path from "path";

export const buildOutputPath = () =>
    path.join(process.cwd(), `/output/Scythe_${Date.now().toString()}.mp4`);

export const buildVideoPath = () =>
    path.join(process.cwd(), `/recording_tmp/video_${Date.now().toString()}.webm`);

export const buildVideoPartPath = (i: number) =>
    path.join(process.cwd(), `/recording_tmp/video_part_${i}_${Date.now().toString()}.webm`);

export const buildAudioPath = () =>
    path.join(process.cwd(), `/recording_tmp/audio_${Date.now().toString()}.webm`);
