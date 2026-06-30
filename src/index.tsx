import { render } from "ink";
import { App } from "./ui/App";
import { TaskQueue } from "./core/queue";

const queue = new TaskQueue();
const { waitUntilExit } = render(<App queue={queue} />);
waitUntilExit().then(() => process.exit(0));
