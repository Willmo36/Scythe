import { Component, h, render } from "preact";

type AppProps = { text: string };
class App extends Component<AppProps> {
    render(props: AppProps) {
        return <div>{props.text}</div>;
    }
}
const appDiv = document.querySelector("#app")!;
render(<App text="init" />, appDiv);

function updateUI(state: AppProps) {
    render(<App {...state} />, appDiv, appDiv.lastChild as Element);
}
