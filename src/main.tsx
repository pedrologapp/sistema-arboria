import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "augmented-ui/augmented-ui.min.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
