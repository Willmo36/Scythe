import * as React from "react";
import { OverlayState } from "./overlayState";
import { RemoteData } from "../domain/RemoteData";
import { DesktopCapturerSource } from "electron";

export class Overlay extends React.Component<{ state: OverlayState }, {}> {
    render() {
        return (
            <div>
                <p>Screens: </p>
                {listScreens(this.props.state.config.video.screens)}
                <p>Microphones: </p>
                {listMicrophones(this.props.state.config.audio.devices)}
            </div>
        );
    }
}

const ScreenList: React.SFC<{ screens: DesktopCapturerSource[] }> = props =>
    props.screens.length === 0 ? (
        <p>No screens found</p>
    ) : (
        <div>{props.screens.map(sc => <li>{sc.name}</li>)}</div>
    );

const listScreens = (screens: RemoteData<DesktopCapturerSource[]>) =>
    screens.fold(
        () => <p>Not yet started</p>,
        () => <p>Fetching screens</p>,
        screens_ => <ScreenList screens={screens_} />,
        () => <p>Something went wrong</p>
    );

const MicrophoneList: React.SFC<{ devices: MediaDeviceInfo[] }> = props =>
    props.devices.length === 0 ? (
        <p>No microphones found</p>
    ) : (
        <div>{props.devices.map(sc => <li>{sc.label}</li>)}</div>
    );

const listMicrophones = (devices: RemoteData<MediaDeviceInfo[]>) =>
    devices.fold(
        () => <p>Not yet started</p>,
        () => <p>Fetching screens</p>,
        ds => <MicrophoneList devices={ds} />,
        () => <p>Something went wrong</p>
    );
