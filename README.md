# DeepSeek-API-Termux

Run **DeepSeek locally inside Termux** and expose it through an **OpenAI-compatible API**.

This project allows you to use local DeepSeek models with applications that support the OpenAI API, including:

- 🚀 OpenCode
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
- 🔥 Chat Completions API
- 📦 No Docker required
- 🌐 Completely local and offline
- 🔌 Compatible with OpenAI-compatible applications
- 🖥️ Easy model management through the OpenCodex GUI

---

# API

Default server address:

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

# Using with OpenCode

OpenCode currently uses the **OpenAI Responses API**, while this project exposes the **OpenAI Chat Completions API**.

To bridge the two, use **OpenCodex**.

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

## Set LM Studio as Default

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
  "object":"list",
  "data":[
    {
      "id":"lm-studio/deepseek-chat"
    },
    {
      "id":"lm-studio/deepseek-expert"
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

Once everything is configured, **you do not need to edit any JSON files** to switch models.

Simply open the OpenCodex dashboard:

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

Select whichever model you want to use.

For example:

- deepseek-chat
- deepseek-expert

Click **Set Default** (if required), then restart OpenCodex if the running instance doesn't immediately refresh.

Verify available models:

```bash
curl http://127.0.0.1:10100/v1/models
```

Example:

```json
{
  "object":"list",
  "data":[
    {
      "id":"lm-studio/deepseek-chat"
    },
    {
      "id":"lm-studio/deepseek-expert"
    }
  ]
}
```

---

# Testing

## Test local API

```bash
curl http://127.0.0.1:8000/v1/models
```

---

## Test OpenCodex proxy

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

- ✅ OpenCode
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
