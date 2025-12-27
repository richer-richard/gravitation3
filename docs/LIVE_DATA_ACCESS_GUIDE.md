# Live Data + AI Backend Setup (Gravitation³)

Gravitation³ can run entirely in the browser for simulations. The **AI assistant** and **live data enrichment** are optional and require local backend services.

## 1) Create a Python virtual environment

From the repo root:

```bash
python3 -m venv venv
./venv/bin/pip install -r api/requirements.txt
```

## 2) Configure environment variables

Copy the template and fill in your key:

```bash
cp api/.env.example api/.env
```

Edit `api/.env` and set `OPENAI_API_KEY`.

## 3) Start the backend

### Option A: Start everything (recommended)

```bash
./app.py
```

Or start servers without opening a browser:

```bash
./app.py --no-browser
```

### Option A2: Dev mode (backend + local web server)

For the smoothest experience (and to avoid `file://` browser limitations), run:

```bash
./scripts/start_dev.sh
```

Then open: `http://localhost:8000/web/index.html`

### Option B: Start via script

```bash
./scripts/start_api.sh
```

### Option C: Start servers individually

```bash
cd api
./start_llm_server.sh
./start_data_server.sh
./start_model_server.sh
```

## Ports

- `5001` — LLM Chatbot server (`/api/chat`)
- `5002` — Data Collection server (`/api/data/submit`)
- `5003` — AI Model server (`/health`, `/api/*/predict`)

## Troubleshooting

- If the AI chat says “Server not connected”, verify `http://localhost:5001/api/health`.
- If model predictions show “Model not loaded”, verify `http://localhost:5003/health` and `http://localhost:5003/api/models/info`.
- If a port is already in use, stop the conflicting process or change the port in the corresponding server file.
