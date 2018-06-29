import { exec } from "child_process";
import { Task } from "fp-ts/lib/Task";
import { buildOutputPath } from "../domain/pathBuilders";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
var ffmpegStatic = require("ffmpeg-static");

export const buildMergeAuidoVideoCommand = (vPath: string, aPath: string) =>
    `${
        ffmpegStatic.path
    } -i ${vPath} -i ${aPath} -vcodec copy -acodec copy -strict -2 ${buildOutputPath()}`;

export const buildMergePartsCommand = (fullPath: string) => (paths: string[]) =>
    `${ffmpegStatic.path} -i "concat:${paths.join("|")}" ${fullPath}`;

//ffmpeg reports into stdErr, so there's no point in handling rejection
export const execCommandIgnoreError = (cmd: string): Task<string> =>
    new Task(() => new Promise<string>(res => exec(cmd, (_err, _stdout, stderr) => res(stderr))));

export const execCommandIgnoreErrorSafe = (cmd: string): TaskEither<Error, string> =>
    tryCatch<Error, string>(() => execCommandIgnoreErrorPromise(cmd), err => err as Error);

export const execCommandIgnoreErrorPromise = (cmd: string): Promise<string> =>
    new Promise(res => exec(cmd, (_err, _stdout, stderr) => res(stderr)));
