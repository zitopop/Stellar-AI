# Public Jarvis access

- `/jarvis` is the conversational Jarvis surface for signed-in Stellar AI users.
- It uses the existing `/api/chat` route, so normal plan, usage and credit enforcement still applies.
- Users can type or use browser speech recognition; spoken replies use browser speech synthesis.
- The public page does not call the private Jarvis mission API.
- The existing private mission workspace is preserved at `/private-workspace.html` and continues to use the owner-gated `/api/desktop-agent?surface=jarvis` backend.
- Private PC control, business missions, owner calling and other privileged tools remain protected by their existing server-side authorization checks.
