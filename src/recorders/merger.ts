var ffmpegStatic = require("ffmpeg-static") as any;
var ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegStatic.path);

const aPath = "../../recordings/audio1.webm";
const vPath = "../../recordings/video1.webm";

const cmd = ffmpeg()
    .input(vPath)
    .input(aPath);

//node_modules/ffmpeg-static/bin/win32/x64/ffmpeg.exe -i recordings/video1.webm -i recordings/audio1.webm -acodec copy -vcodec copy OMG.mp4
