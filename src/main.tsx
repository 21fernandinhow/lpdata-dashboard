import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "@/App"
import { createSession } from "@/session/session"
import "@/styles/index.scss"

const session = createSession()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App session={session} />
  </StrictMode>,
)
