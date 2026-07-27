DeepSeek-API-Termux

Run DeepSeek authentication inside Termux and automatically capture the required session for the original DeepSeek-API project.

This repository only provides a Termux-friendly authentication flow. Once your session has been captured, continue with the original DeepSeek-API repository to install and run the OpenAI-compatible API server.

«Original project: https://github.com/sums001/Deepseek-API»

---

Features

- ✅ Designed for Termux
- 🖥️ Chromium authentication through Termux:X11
- 🔑 Automatically captures your DeepSeek session
- 💾 Saves your session locally
- 🚀 Fully compatible with the original DeepSeek-API project

---

Prerequisites

Install the latest Termux.

Also install:

- Termux:X11 Nightly
- Termux:X11 Nightly Repository

Nightly builds are recommended to avoid compatibility issues.

Update Termux and enable the X11 repository:

pkg update
pkg upgrade

pkg install x11-repo
pkg update

Install the required packages:

pkg install python nodejs chromium git

You should now have:

- ✅ Termux
- ✅ Termux:X11 (Nightly)
- ✅ x11-repo
- ✅ Python
- ✅ Node.js (includes npm)
- ✅ Chromium
- ✅ Git

---

Installation

Clone this repository:

git clone https://github.com/<your-username>/DeepSeek-API-Termux.git
cd DeepSeek-API-Termux

Install the Python dependencies:

pip install -r requirements.txt

Install the Node.js dependencies:

npm install

---

Start Termux:X11

Before authenticating, start the Termux:X11 server.

Run the following in the same terminal session:

termux-x11 :0 &
export DISPLAY=:0

Do not open another terminal tab.

Continue using the same shell.

---

Capture your DeepSeek session

Run:

python -m deepseek.auth

A Chromium window will open.

Important

- ✅ Log in using your existing DeepSeek account
- ❌ Do not create a new account during authentication

Creating a new account through the automated login flow may trigger additional verification or security checks.

Once login completes, your authentication token and session will be captured automatically and stored locally.

---

Next Step

After successfully capturing your session, continue with the original DeepSeek-API setup guide:

https://github.com/sums001/Deepseek-API

Follow the instructions there to:

- Install the remaining dependencies
- Start the OpenAI-compatible API server
- Use the Python library
- Connect OpenAI-compatible clients
- Configure streaming, conversations, DeepThink, and web search

This repository only handles authentication for Termux.

---

Notes

- Your authentication session is stored locally on your device.
- Never share your session files.
- Use your own DeepSeek account.
- This project does not bypass DeepSeek authentication or DeepSeek's Terms of Service.

---

Credits

This project is a fork of:

https://github.com/sums001/Deepseek-API

All credit for the original implementation goes to sums001 and contributors.

This fork only adds a Termux-compatible authentication and automatic session capture workflow.

---

License

This project is licensed under the MIT License, following the original DeepSeek-API project.
