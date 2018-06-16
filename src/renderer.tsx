import { desktopCapturer, SourcesOptions, globalShortcut, ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";
import { formatRelative } from "date-fns";
import { h, render, Component } from "preact";
import { either, Either, fromNullable } from "fp-ts/lib/Either";
import { task, Task } from "fp-ts/lib/Task";
import { taskEither, TaskEither, taskify, right } from "fp-ts/lib/TaskEither";
import { spy } from "fp-ts/lib/Trace";
import * as most from "most";
import { create as createStream } from "@most/create";
import * as LRU from "./lru";
import { CommandStreams, commands } from "./commands";
import { writeBlobs } from "./blob";
import * as Video from "./recorders/video";
import * as Audio from "./recorders/audio";

//this is defo wrong
function runAll<T>(task$: most.Stream<Task<T>>) {
    return new Task(() => task$.forEach(t => t.run()));
}

//turn Video & Audio into "recorder" semigroups
const audio = Audio.setup(commands).chain(runAll);
const video = Video.setup(commands).chain(runAll);
const recorders = [video, audio];
Promise.all(recorders.map(r => r.run())).catch(e => console.error("app error"));
