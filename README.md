# DeepSeek-API-Termux

Run **DeepSeek locally inside Termux** and expose it through an **OpenAI-compatible API**.

This repository is intended **only for installing and running the local DeepSeek API server**. Once installed, it can be used with any application that supports the OpenAI Chat Completions API.

Compatible applications include:

- 🚀 OpenCode (via OpenCodex)
- 🤖 Continue
- 💻 Cline
- 🦘 Roo Code
- 🌐 Open WebUI
- 💬 LibreChat
- 🔌 Any client supporting the OpenAI Chat Completions API

---

# Features

- 🚀 Runs entirely inside Termux
- 🤖 OpenAI-compatible API
- 💬 OpenAI Chat Completions API
- 📦 No Docker required
- 🌐 Completely local and offline
- 🔌 Compatible with OpenAI-compatible applications
- 🖥️ Easy model management through OpenCodex

---

# Prerequisites

Before installing **DeepSeek-API-Termux**, install the latest **Termux:X11**.

Nightly builds are recommended to avoid compatibility issues.

## Install required packages

```bash
pkg update
pkg upgrade

pkg install nodejs
pkg install npm
pkg install chromium
```

Also install the latest **termux-x11** package.

---

# Start Termux:X11

Launch Termux:X11 before authenticating.

In the **same terminal session** you'll use for the installation, run:

```bash
termux-x11 :0 &
export DISPLAY=:0
```

**Do not open another terminal tab.**

Continue using this same shell for the remaining commands.

---

# Authenticate DeepSeek

After installing the package, authenticate by running:

```bash
python -m deepseek.auth
```

A Chromium window will open.

## Important

- ✅ Log in to your **existing DeepSeek account**
- ❌ Do **NOT** create a new account during authentication

Creating accounts through this automated login flow may trigger additional verification or flag your IP.

Once login completes, the authentication token will be captured automatically.

---

# API

Default server:

```
http://127.0.0.1:8000/v1
```

Supported endpoints:

```
GET  /v1/models
POST /v1/chat/completions
```

---

# Verify Installation

```bash
curl http://127.0.0.1:8000/v1/models
```

Expected response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "deepseek-chat"
    },
    {
      "id": "deepseek-expert"
    }
  ]
}
```

---

# Why OpenCodex?

This project exposes the **OpenAI Chat Completions API**.

OpenCode currently uses the newer **OpenAI Responses API**, so it cannot communicate directly with this server.

OpenCodex acts as a compatibility layer by translating Responses API requests into Chat Completions API requests.

Applications that already support the OpenAI Chat Completions API (such as Continue, Cline, Roo Code, Open WebUI and LibreChat) can connect directly without OpenCodex if they support custom endpoints.

---

# Install OpenCodex

```bash
npm install -g @bitkyc08/opencodex
```

---

# Configure OpenCodex

Start OpenCodex once:

```bash
ocx start
```

Open the dashboard:

```
http://localhost:10100
```

Go to:

```
Providers
```

Add a new provider.

## Provider Type

```
LM Studio
```

## Base URL

```
http://127.0.0.1:8000/v1
```

## API Key

```
dummy
```

## Default Model

```
deepseek-chat
```

Enable:

```
☑ Allow local/private network
```

Click:

```
Add Provider
```

---

# Set LM Studio as Default

After adding the provider:

1. Open **Providers**
2. Select **LM Studio**
3. Click **Set as Default**
4. Restart OpenCodex

(Optional)

Delete the default OpenAI provider afterwards.

---

# Start OpenCodex

```bash
ocx start
```

Verify:

```bash
curl http://127.0.0.1:10100/v1/models
```

Expected:

```json
{
  "object": "list",
  "data": [
    {
      "id": "lm-studio/deepseek-chat"
    },
    {
      "id": "lm-studio/deepseek-expert"
    }
  ]
}
```

---

# Configure OpenCode

Example configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openai": {
      "options": {
        "baseURL": "http://127.0.0.1:10100/v1",
        "apiKey": "dummy"
      },
      "models": {
        "lm-studio/deepseek-chat": {},
        "lm-studio/deepseek-expert": {}
      }
    }
  },
  "model": "openai/lm-studio/deepseek-chat"
}
```

---

# Changing Models

Once configured, you do **not** need to edit any JSON files.

Open the OpenCodex dashboard:

```
http://localhost:10100
```

Navigate to:

```
Providers
    ↓
LM Studio
    ↓
Models
```

Select the model you want to use.

Examples:

- deepseek-chat
- deepseek-expert

Click **Set Default** if required.

Restart OpenCodex if the running instance doesn't refresh automatically.

Verify:

```bash
curl http://127.0.0.1:10100/v1/models
```

---

# Testing

## Test the local API

```bash
curl http://127.0.0.1:8000/v1/models
```

---

## Test the OpenCodex proxy

```bash
curl http://127.0.0.1:10100/v1/models
```

---

## Test Chat Completion

```bash
curl http://127.0.0.1:10100/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer dummy" \
-d '{
  "model":"lm-studio/deepseek-chat",
  "messages":[
    {
      "role":"user",
      "content":"Hello!"
    }
  ]
}'
```

---

# Architecture

```
                 OpenCode
                     │
                     ▼
      http://127.0.0.1:10100/v1
                     │
              OpenCodex Proxy
                     │
                     ▼
             LM Studio Provider
                     │
                     ▼
      http://127.0.0.1:8000/v1
                     │
             DeepSeek API Server
                     │
                     ▼
              Local DeepSeek Model
```

---

# Compatible Clients

This repository only installs the local API server.

You can use it with any client supporting the OpenAI Chat Completions API.

Examples include:

- ✅ OpenCode (via OpenCodex)
- ✅ Continue
- ✅ Cline
- ✅ Roo Code
- ✅ Open WebUI
- ✅ LibreChat
- ✅ Anything supporting the OpenAI Chat Completions API

---

# Troubleshooting

## OpenCode asks for an OpenAI login

Ensure OpenCode points to OpenCodex instead of OpenAI.

Base URL:

```
http://127.0.0.1:10100/v1
```

API Key:

```
dummy
```

Model:

```
openai/lm-studio/deepseek-chat
```

---

## OpenCodex still uses OpenAI

Run:

```bash
ocx provider list
```

Expected:

```
lm-studio (default)
```

If OpenAI is still the default:

1. Open the OpenCodex dashboard.
2. Open **Providers**.
3. Select **LM Studio**.
4. Click **Set as Default**.
5. Restart OpenCodex.

After LM Studio becomes the default, you may safely delete the OpenAI provider.

---

## Loopback address error

If you see:

```
baseUrl points to a loopback address
```

Enable:

```
Allow local/private network
```

when adding the provider.

---

## Wrong model names

OpenCodex prefixes the provider name.

Instead of:

```
deepseek-chat
```

Use:

```
lm-studio/deepseek-chat
```

Verify:

```bash
curl http://127.0.0.1:10100/v1/models
```

---

## Models do not appear

Restart OpenCodex:

```bash
ocx restart
```

or refresh the provider from the dashboard.

---

# Roadmap

- [ ] OpenAI Responses API support
- [ ] Streaming improvements
- [ ] Embeddings API
- [ ] Vision support
- [ ] Function calling
- [ ] Multi-model routing
- [ ] Automatic OpenCode configuration
- [ ] One-click OpenCodex setup

---

# License

MIT
