#!/./venv/bin/python3
"""
Gravitation³ LLM Chatbot Server
Provides GPT-5 chatbot integration with vision support for simulation analysis
"""

import os
import json
import base64
import requests
import re
import unicodedata
from datetime import datetime
from contextlib import closing
from io import BytesIO
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins including file://
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'https://api.openai.com/v1').rstrip('/')
MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.1')
TEMPERATURE = float(os.getenv('TEMPERATURE', '0.7'))
MAX_TOKENS = int(os.getenv('MAX_TOKENS', '2000'))
MAX_CONTEXT_LENGTH = int(os.getenv('MAX_CONTEXT_LENGTH', '8000'))
DATA_SERVER_URL = os.getenv('DATA_SERVER_URL', 'http://localhost:5002')
CHAT_ENDPOINT = f"{OPENAI_API_BASE}/chat/completions"
RESPONSES_ENDPOINT = f"{OPENAI_API_BASE}/responses"
REASONING_EFFORT = os.getenv('OPENAI_REASONING_EFFORT', '').strip().lower()
if REASONING_EFFORT not in {'low', 'medium', 'high'}:
    REASONING_EFFORT = ''

# System prompts for different simulations
SIMULATION_PROMPTS = {
    "Three-Body": """You are an AI assistant for the Three-Body Problem simulation in Gravitation³. 
You have real-time access to the simulation state including body positions, velocities, energy, and entropy.
Explain complex gravitational dynamics in plain language, identify orbital patterns (figure-8, Lagrange points, chaos), 
suggest parameter adjustments for interesting behaviors, and help users understand n-body physics.""",
    
    "Double-Pendulum": """You are an AI assistant for the Double Pendulum simulation in Gravitation³.
You have real-time access to pendulum angles, velocities, energy, and entropy.
Explain chaotic motion, sensitivity to initial conditions, phase space trajectories, and conservation laws.
Help users understand how small changes create dramatically different outcomes.""",
    
    "Lorenz-Attractor": """You are an AI assistant for the Lorenz Attractor simulation in Gravitation³.
You have real-time access to the system state (x, y, z coordinates) and parameters (σ, ρ, β).
Explain strange attractors, butterfly effect, deterministic chaos, and how this system models atmospheric convection.
Identify when the system is on different wings of the attractor.""",
    
    "Rossler-Attractor": """You are an AI assistant for the Rössler Attractor simulation in Gravitation³.
You have real-time access to system state and parameters (a, b, c).
Explain the scrolling behavior, periodic orbits, and chaos in this simpler 3D chaotic system.
Compare it to the Lorenz attractor when asked.""",
    
    "Double-Gyre": """You are an AI assistant for the Double Gyre fluid simulation in Gravitation³.
Explain ocean circulation patterns, Lagrangian coherent structures, particle advection, and vortex dynamics.
Help users understand how fluids mix and create coherent structures.""",
    
    "Lid-Cavity": """You are an AI assistant for the Lid-Driven Cavity fluid simulation in Gravitation³.
Explain viscous flow, vortex formation, Reynolds number effects, and boundary layers.
This is a classic CFD benchmark problem.""",
    
    "Malkus-Waterwheel": """You are an AI assistant for the Malkus Waterwheel simulation in Gravitation³.
Explain chaotic rotation, the connection to Lorenz equations, and how this mechanical system exhibits chaos.
Discuss energy dissipation and periodic vs chaotic behavior.""",
    
    "Hopalong-Attractor": """You are an AI assistant for the Hopalong Attractor simulation in Gravitation³.
Explain this discrete dynamical system's fractal-like patterns and chaotic behavior.""",
    
    "Turbulent-Jet": """You are an AI assistant for the Turbulent Jet simulation in Gravitation³.
Explain turbulence, vortex shedding, mixing, and energy cascade from large to small scales.""",
    
    "default": """You are an AI assistant for Gravitation³, an interactive physics simulation platform.
You have access to real-time simulation data. Explain physics concepts clearly, identify patterns,
suggest interesting parameter values, and help users understand complex dynamical systems."""
}

def normalize_simulation_name(value: str) -> str:
    if not value:
        return 'default'
    text = str(value).strip()
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text or 'default'


SIMULATION_PROMPT_LOOKUP = {
    normalize_simulation_name(key): prompt
    for key, prompt in SIMULATION_PROMPTS.items()
}

# Common aliases (normalized) → canonical prompt key (normalized)
SIMULATION_PROMPT_ALIASES = {
    'three-body-problem': 'three-body',
    'threebody': 'three-body',
    'lorenz': 'lorenz-attractor',
    'rossler': 'rossler-attractor',
    'roessler-attractor': 'rossler-attractor',
    'roessler': 'rossler-attractor',
    'doublegyre': 'double-gyre',
    'malkus': 'malkus-waterwheel',
}


def normalize_text_fragment(value):
    if value is None:
        return ''
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get('text') or value.get('content') or ''
    if isinstance(value, (list, tuple)):
        return ''.join(normalize_text_fragment(item) for item in value)
    return str(value)


def map_content_item(role, item):
    role = role or 'user'
    # Responses API requires 'input_text' for user and 'output_text' for assistant
    text_type = 'output_text' if role == 'assistant' else 'input_text'
    
    if isinstance(item, str):
        return {'type': text_type, 'text': item}
    
    if isinstance(item, dict):
        item_type = item.get('type')
        if item_type in ('text', 'input_text', 'output_text'):
            fragment = normalize_text_fragment(item.get('text') or item.get('content'))
            if fragment:
                return {'type': text_type, 'text': fragment}
        if item_type == 'image_url' and item.get('image_url'):
            return {'type': 'input_image', 'image_url': item['image_url']}
        if item_type == 'input_image':
            return item
    
    fragment = normalize_text_fragment(item)
    if fragment:
        return {'type': text_type, 'text': fragment}
    return None


def convert_conversation_to_chat_format(conversation):
    """Convert conversation to standard OpenAI chat format."""
    converted = []
    for message in conversation:
        role = message.get('role', 'user')
        content = message.get('content')
        
        if isinstance(content, list):
            # Handle content blocks (text, images, etc.)
            content_blocks = []
            for item in content:
                if isinstance(item, str):
                    content_blocks.append({'type': 'text', 'text': item})
                elif isinstance(item, dict):
                    if item.get('type') == 'image_url':
                        content_blocks.append(item)
                    elif item.get('type') in ('text', 'input_text'):
                        text = item.get('text', item.get('content', ''))
                        if text:
                            content_blocks.append({'type': 'text', 'text': text})
            
            # Only use array format if there are multiple content types or images
            if len(content_blocks) > 1 or any(b.get('type') == 'image_url' for b in content_blocks):
                converted.append({
                    'role': role,
                    'content': content_blocks if content_blocks else [{'type': 'text', 'text': ''}]
                })
            elif content_blocks:
                # Single text block - use string format
                converted.append({
                    'role': role,
                    'content': content_blocks[0].get('text', '')
                })
            else:
                converted.append({'role': role, 'content': ''})
        else:
            # Simple string content
            text = str(content) if content else ''
            converted.append({
                'role': role,
                'content': text
            })
    
    return converted


def convert_conversation_to_responses_input(conversation):
    """Convert conversation to the Responses API message structure.
    
    CRITICAL: The Responses API ONLY accepts:
    - User messages with ONLY 'input_text' content type
    - Assistant messages with ONLY 'output_text' or 'refusal' content type
    - NO system messages in the array at all
    
    System prompts are prepended to the first user message as text.
    """
    # STEP 1: Filter out all system messages and collect system content
    system_texts = []
    non_system_messages = []
    
    for message in conversation:
        role = message.get('role', 'user')
        if role == 'system':
            text = normalize_text_fragment(message.get('content', ''))
            if text:
                system_texts.append(text)
        else:
            non_system_messages.append(message)
    
    # STEP 2: Build the output messages, prepending system content to first user message
    formatted = []
    first_user_found = False
    combined_system = '\n\n'.join(system_texts) if system_texts else None
    
    for message in non_system_messages:
        role = message.get('role', 'user')
        content = message.get('content')
        
        # For the FIRST user message, prepend system content
        if role == 'user' and not first_user_found and combined_system:
            first_user_found = True
            user_text = normalize_text_fragment(content)
            
            # Extract text from list content if needed
            if isinstance(content, list):
                text_parts = []
                image_parts = []
                for item in content:
                    if isinstance(item, dict):
                        if item.get('type') in ('text', 'input_text'):
                            text_parts.append(item.get('text', ''))
                        elif item.get('type') == 'image_url':
                            image_parts.append(item)
                    elif isinstance(item, str):
                        text_parts.append(item)
                user_text = ''.join(text_parts)
                
                # Combine system + user text
                combined_text = f"{combined_system}\n\n---\n\n{user_text}"
                parts = [{'type': 'input_text', 'text': combined_text}]
                parts.extend(image_parts)
            else:
                combined_text = f"{combined_system}\n\n---\n\n{user_text}"
                parts = [{'type': 'input_text', 'text': combined_text}]
            
            formatted.append({'role': 'user', 'content': parts})
            continue
        
        # For other messages, process normally
        parts = []
        if isinstance(content, list):
            for item in content:
                mapped = map_content_item(role, item)
                if mapped:
                    parts.append(mapped)
        else:
            mapped = map_content_item(role, content)
            if mapped:
                parts.append(mapped)
        
        if not parts:
            default_type = 'input_text' if role == 'user' else 'output_text'
            parts = [{'type': default_type, 'text': ''}]
        
        formatted.append({'role': role, 'content': parts})
    
    return formatted


def extract_text_from_delta(delta):
    if not delta:
        return ''
    if isinstance(delta, str):
        return delta
    if isinstance(delta, dict):
        if isinstance(delta.get('text'), str):
            return delta['text']
        if isinstance(delta.get('content'), (list, tuple)):
            return ''.join(extract_text_from_delta(part) for part in delta['content'])
        if isinstance(delta.get('output_text'), list):
            return ''.join(extract_text_from_delta(part) for part in delta['output_text'])
        if isinstance(delta.get('reasoning_content'), list):
            return ''.join(extract_text_from_delta(part) for part in delta['reasoning_content'])
        if isinstance(delta.get('delta'), (dict, list, str)):
            return extract_text_from_delta(delta['delta'])
    if isinstance(delta, (list, tuple)):
        return ''.join(extract_text_from_delta(part) for part in delta)
    return str(delta)

def build_chat_payload(conversation, stream=False):
    """Create the payload for the OpenAI chat/completions endpoint."""
    payload = {
        "model": MODEL,
        "messages": convert_conversation_to_chat_format(conversation),
        "temperature": TEMPERATURE,
    }
    if stream:
        payload["stream"] = True
    return payload


def build_responses_payload(conversation, stream=False):
    """Create the payload for the OpenAI Responses endpoint.
    
    The Responses API accepts: model, input (messages array), stream
    """
    # Build messages array using the Responses API message format
    messages = convert_conversation_to_responses_input(conversation)
    
    # Build payload using only supported parameters
    payload = {
        "model": MODEL,
        "input": messages  # Pass messages array directly (not wrapped in object)
    }
    
    # Include optional knobs only if the API supports them
    if TEMPERATURE is not None:
        payload["temperature"] = TEMPERATURE
    
    # Optional stream parameter
    if stream:
        payload["stream"] = True
    
    return payload


def format_sse(payload):
    """Serialize a dict payload into an SSE data frame."""
    return f"data: {json.dumps(payload)}\n\n"


def call_openai_chat(conversation, stream=False, timeout=65):
    """Send a request to the OpenAI chat/completions endpoint."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = build_chat_payload(conversation, stream=stream)
    
    try:
        response = requests.post(
            CHAT_ENDPOINT,
            headers=headers,
            json=payload,
            stream=stream,
            timeout=timeout
        )
        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as e:
        print(f"🔴 OpenAI API Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"🔴 Response: {error_data}")
            except:
                print(f"🔴 Response text: {e.response.text}")
        raise


def call_openai_responses(conversation, stream=False, timeout=65):
    """Send a request to the OpenAI responses endpoint."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = build_responses_payload(conversation, stream=stream)
    
    # Log payload for debugging
    print(f"🔵 Responses payload keys: {list(payload.keys())}")
    print(f"🔵 Responses payload JSON: {json.dumps(payload, default=str)[:500]}")

    try:
        response = requests.post(
            RESPONSES_ENDPOINT,
            headers=headers,
            json=payload,
            stream=stream,
            timeout=timeout
        )
        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as e:
        print(f"🔴 Responses API Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"🔴 Response: {error_data}")
            except:
                print(f"🔴 Response text: {e.response.text}")
        raise


def pump_chat_completion_stream(response):
    """Yield normalized events from the chat/completions streaming response."""
    summary = {
        'provider': 'chat',
        'raw_chunks': 0,
        'content_chunks': 0,
        'reasoning_chunks': 0,
        'finish_reason': None
    }

    try:
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line or raw_line.startswith(':'):
                continue

            if not raw_line.startswith('data:'):
                continue

            payload = raw_line[5:].strip()
            if not payload:
                continue

            if payload == '[DONE]':
                print("🔵 Chat stream signaled completion")
                break

            try:
                event = json.loads(payload)
            except json.JSONDecodeError as jse:
                print(f"⚠️ Could not decode chat payload: {payload[:100]}")
                print(f"⚠️ JSON error: {jse}")
                continue

            summary['raw_chunks'] += 1

            if 'error' in event:
                error_msg = event['error'].get('message', 'Unknown error')
                print(f"🔴 Chat stream error: {error_msg}")
                raise RuntimeError(error_msg)

            choices = event.get('choices', [])
            if not choices:
                continue

            choice = choices[0]
            delta = choice.get('delta', {})
            
            # Only extract text from delta.content, not the whole delta
            if 'content' in delta:
                content = delta['content']
                if content:
                    summary['content_chunks'] += 1
                    print(f"🔵 Chat content chunk #{summary['content_chunks']}: {len(content)} chars")
                    yield format_sse({'content': content})

            finish_reason = choice.get('finish_reason')
            if finish_reason:
                summary['finish_reason'] = finish_reason
                if finish_reason == 'stop':
                    print("🔵 Chat stream finish reason: stop")
    except Exception as e:
        print(f"🔴 Chat stream exception: {e}")
        raise

    print(f"🔵 Chat stream closed. Raw chunks: {summary['raw_chunks']}, "
          f"Content chunks: {summary['content_chunks']}")
    return summary


def pump_responses_stream(response):
    """Yield normalized events from the Responses API streaming response.
    
    The Responses API streams many event types. Only response.output_text.delta
    contains actual response text. Other events are metadata/tool calls and should
    be skipped (don't try to parse as text).
    """
    summary = {
        'provider': 'responses',
        'raw_chunks': 0,
        'content_chunks': 0,
        'reasoning_chunks': 0,
        'event_counts': {},
        'last_event': None
    }
    current_event = None

    try:
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue

            if raw_line.startswith(':'):
                continue

            if raw_line.startswith('event:'):
                current_event = raw_line[6:].strip()
                continue

            if not raw_line.startswith('data:'):
                continue

            payload = raw_line[5:].strip()
            if not payload:
                continue

            if payload == '[DONE]':
                print("🔵 Responses stream signaled completion")
                break

            try:
                event = json.loads(payload)
            except json.JSONDecodeError:
                print(f"⚠️ Could not decode responses payload: {payload[:120]}")
                continue

            summary['raw_chunks'] += 1

            # Determine event type from 'type' field or event header
            event_type = event.get('type') or current_event or ''
            summary['last_event'] = event_type
            if event_type:
                summary['event_counts'][event_type] = summary['event_counts'].get(event_type, 0) + 1

            # Only process specific important events
            # Most events are metadata/tool calls and should be skipped
            if event_type == 'response.output_text.delta':
                # This is the ONLY event type that contains actual response text
                delta = event.get('delta')
                if delta:
                    text = normalize_text_fragment(delta)
                    if text:
                        summary['content_chunks'] += 1
                        print(f"🔵 Responses content chunk #{summary['content_chunks']}: {len(text)} chars")
                        yield format_sse({'content': text})
            elif event_type == 'response.output_text.done':
                # Marks end of text output
                continue
            elif event_type == 'response.reasoning.delta':
                # Reasoning thinking (if enabled)
                delta = event.get('delta')
                if delta:
                    reasoning = normalize_text_fragment(delta)
                    if reasoning:
                        summary['reasoning_chunks'] += 1
                        yield format_sse({'reasoning': reasoning})
            elif event_type == 'response.reasoning.done':
                # Marks end of reasoning
                yield format_sse({'reasoning_complete': True})
            elif event_type == 'response.completed':
                # Response completed - extract usage if present
                response_obj = event.get('response', {})
                usage = response_obj.get('usage') or event.get('usage')
                if usage:
                    yield format_sse({'usage': usage})
            elif event_type == 'response.error':
                # Error during streaming
                error_info = event.get('error', {})
                if isinstance(error_info, dict):
                    message = error_info.get('message', 'Unknown error in Responses API stream')
                else:
                    message = str(error_info)
                print(f"🔴 Responses stream error: {message}")
                raise RuntimeError(message)
            else:
                # Skip all other event types (metadata, tool calls, etc.)
                # Don't try to parse them as text
                if event_type:
                    print(f"🔵 Responses skipping {event_type} (metadata/tool event)")
                continue

    except Exception as e:
        print(f"🔴 Responses stream exception: {e}")
        raise

    print(f"🔵 Responses stream closed. Raw chunks: {summary['raw_chunks']}, "
          f"Content chunks: {summary['content_chunks']}, Reasoning chunks: {summary['reasoning_chunks']}, "
          f"Event types: {list(summary['event_counts'].keys())}")
    return summary


def extract_text_from_output_blocks(output_blocks):
    """Convert the Responses API output structure into plain text."""
    if not output_blocks:
        return ""
    
    fragments = []
    
    for block in output_blocks:
        contents = block.get('content') if isinstance(block, dict) else None
        if not contents:
            continue
        
        for item in contents:
            text_value = None
            if isinstance(item, str):
                text_value = item
            elif isinstance(item, dict):
                if item.get('type') in ('output_text', 'text'):
                    text_value = item.get('text')
                elif 'text' in item:
                    text_value = item['text']
                
                if isinstance(text_value, dict):
                    text_value = text_value.get('value') or text_value.get('text')
            
            if isinstance(text_value, str):
                fragments.append(text_value)
    
    return ''.join(fragments).strip()

def fetch_live_data(simulation_id):
    """Fetch live data from the data collection server (non-blocking with short timeout)"""
    # CB-1 fix: Use very short timeout (0.5s) to avoid blocking chat requests
    # If data server is down, we skip live data enrichment gracefully
    try:
        response = requests.get(
            f"{DATA_SERVER_URL}/api/data/get/{simulation_id}?seconds=10", 
            timeout=0.5  # Very short timeout - fail fast
        )
        if response.ok:
            return response.json()
        else:
            print(f"⚠️ Failed to fetch live data: {response.status_code}")
            return None
    except requests.exceptions.Timeout:
        print(f"⚠️ Live data fetch timeout (data service may be unavailable)")
        return None
    except requests.exceptions.ConnectionError:
        print(f"⚠️ Cannot connect to data service - skipping live data enrichment")
        return None
    except Exception as e:
        print(f"⚠️ Error fetching live data: {e}")
        return None


def get_system_prompt(simulation_name, simulation_data, historical_stats=None):
    """Generate system prompt with current simulation context"""
    normalized_name = normalize_simulation_name(simulation_name)
    normalized_name = SIMULATION_PROMPT_ALIASES.get(normalized_name, normalized_name)
    base_prompt = SIMULATION_PROMPT_LOOKUP.get(normalized_name, SIMULATION_PROMPTS["default"])
    
    def fmt(value, digits=4, default='n/a'):
        try:
            return f"{float(value):.{digits}f}"
        except (TypeError, ValueError):
            return default
    
    # Try to fetch live data from data server
    live_data_summary = ""
    simulation_id = simulation_data.get('simulation_id') if simulation_data else None
    if simulation_id:
        live_data = fetch_live_data(simulation_id)
        if live_data and live_data.get('data'):
            data_points = live_data.get('data', [])
            time_span = live_data.get('time_span', 0)
            live_data_summary = f"\n\n🔴 LIVE DATA ACCESS (Last {time_span:.1f}s, {len(data_points)} samples):\n"
            live_data_summary += "You have direct access to real simulation data from the backend!\n"
            live_data_summary += f"- Data points collected: {len(data_points)}\n"
            if data_points:
                first = data_points[0]
                last = data_points[-1]
                live_data_summary += f"- Time range: {first.get('time', 0):.2f}s to {last.get('time', 0):.2f}s\n"
                live_data_summary += f"- Energy evolution: {first.get('energy', 0):.4f} → {last.get('energy', 0):.4f}\n"
                if 'bodies' in last:
                    live_data_summary += f"- Tracking {len(last.get('bodies', []))} bodies/trajectories\n"
                live_data_summary += "\nThis real-time data stream proves you can access actual simulation data!\n"
    
    # Add current state information
    context = f"\n\n📊 CURRENT SIMULATION STATE ({simulation_name}):\n"
    
    if simulation_data:
        if 'time' in simulation_data:
            context += f"- Simulation Time: {simulation_data['time']:.2f}s\n"
        if 'energy' in simulation_data:
            context += f"- Total Energy: {simulation_data['energy']:.4f}\n"
        if 'entropy' in simulation_data:
            context += f"- Entropy: {simulation_data['entropy']:.4f}\n"
        if 'fps' in simulation_data:
            context += f"- Frame Rate: {simulation_data['fps']} FPS\n"
        
        # Add body/particle information if available
        if 'bodies' in simulation_data and isinstance(simulation_data['bodies'], list):
            context += f"\nBodies ({len(simulation_data['bodies'])}):\n"
            for i, body in enumerate(simulation_data['bodies'][:5]):  # Limit to first 5
                if 'name' in body and 'position' in body:
                    pos = body['position']
                    context += f"  {body['name']}: pos({pos[0]:.2f}, {pos[1]:.2f}, {pos[2]:.2f})"
                    if 'velocity' in body:
                        vel = body['velocity']
                        context += f", vel({vel[0]:.2f}, {vel[1]:.2f}, {vel[2]:.2f})"
                    if 'mass' in body:
                        context += f", mass={body['mass']:.2f}"
                    context += "\n"
        
        # Add parameters
        if 'parameters' in simulation_data:
            params = simulation_data['parameters']
            context += f"\nActive Parameters:\n"
            for key, value in params.items():
                context += f"  {key}: {value}\n"
        
        # Add statistics
        if 'statistics' in simulation_data:
            stats = simulation_data['statistics']
            context += f"\nStatistics:\n"
            for key, value in stats.items():
                context += f"  {key}: {value}\n"
    
    history_section = ""
    if historical_stats:
        if historical_stats.get('available') is False:
            reason = historical_stats.get('reason', 'Not enough samples yet.')
            history_section = f"\n\n📈 Historical window unavailable: {reason}\n"
        else:
            data_points = historical_stats.get('dataPoints', 0)
            time_span = historical_stats.get('timeSpan', 0)
            history_section = f"\n\n📈 HISTORICAL OVERVIEW ({data_points} samples / {fmt(time_span, digits=1)}s)\n"
            
            energy_stats = historical_stats.get('energy') or {}
            if energy_stats:
                avg_energy = fmt(energy_stats.get('average'))
                trend_value = energy_stats.get('trend')
                trend_str = f"{trend_value:+.6f}" if isinstance(trend_value, (int, float)) else "n/a"
                history_section += f"- Energy avg={avg_energy} trend={trend_str} per sample\n"
            
            momentum_stats = historical_stats.get('momentum') or {}
            if momentum_stats:
                avg_momentum = fmt(momentum_stats.get('average'))
                min_momentum = fmt(momentum_stats.get('min', 0))
                max_momentum = fmt(momentum_stats.get('max', 0))
                history_section += f"- Momentum avg={avg_momentum} (min {min_momentum}, max {max_momentum})\n"
            
            trajectories = historical_stats.get('trajectories') or []
            if trajectories:
                history_section += "- Top trajectories:\n"
                for traj in trajectories[:3]:
                    history_section += (
                        f"    • {traj.get('body', 'Body')}: "
                        f"path={fmt(traj.get('pathLength'), digits=2)}, "
                        f"avg_speed={fmt(traj.get('avgSpeed'), digits=2)}, "
                        f"max_speed={fmt(traj.get('maxSpeed'), digits=2)}\n"
                    )
    
    context += live_data_summary
    context += history_section
    
    context += "\nYour role:\n"
    context += "1. Analyze the current state and provide insights in plain language\n"
    context += "2. Explain what's happening physically\n"
    context += "3. Suggest parameter adjustments for interesting behaviors\n"
    context += "4. Identify patterns, stability, or chaos\n"
    context += "5. Answer questions using the actual data you see\n"
    context += "6. If you see a screenshot, analyze the visual patterns and trajectories\n"
    context += "7. Use the LIVE DATA from the backend to provide accurate, real-time analysis\n"
    
    context += "\n🗣️ RESPONSE STYLE & FORMAT\n"
    context += "- Be warm, conversational, and encouraging—like a knowledgeable friend explaining physics to you.\n"
    context += "- Keep the text natural and readable: use mostly normal text, with **bold** only for key terms or emphasis.\n"
    context += "- Use headers (# Main Topic, ## Subtopic) to organize, but don't over-format.\n"
    context += "- Use bullet points for lists, but write most content as flowing paragraphs.\n"
    context += "- For mathematical formulas (MathJax rendering):\n"
    context += "  * Inline formulas: wrap in single $ signs, like $E = mc^2$ - appears mid-sentence\n"
    context += "  * Block formulas: put $$ on its own line with blank lines before and after:\n"
    context += "\n"
    context += "    Some explanation here.\n"
    context += "\n"
    context += "    $$F = G\\frac{m_1 m_2}{r^2}$$\n"
    context += "\n"
    context += "    Then explain what it means in plain language.\n"
    context += "\n"
    context += "  * Use subscripts like m_1, m_2 (with underscore), not m1, m2\n"
    context += "  * Keep formulas simple and clear\n"
    context += "- Avoid excessive bold, italics, or markdown formatting. Let the content speak for itself.\n"
    context += "- Keep explanation concise, warm, and focused on clarity.\n"
    
    return base_prompt + context

def process_image(image_data):
    """Process base64 image data for GPT-4 Vision"""
    try:
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        
        # Open with PIL to validate
        img = Image.open(BytesIO(image_bytes))
        
        # Resize if too large (max 2048x2048 for GPT-4 Vision)
        max_size = 2048
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Convert back to base64
            buffered = BytesIO()
            img.save(buffered, format=img.format or "PNG")
            image_data = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{image_data}"
    except Exception as e:
        print(f"Error processing image: {e}")
        return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    """Main chat endpoint with streaming support"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Handle both JSON and FormData (multipart/form-data with file attachments)
        # IMPORTANT: Try form data first (always available), then JSON, never force JSON parsing
        data = {}
        
        # Check if we have form data (includes multipart/form-data and application/x-www-form-urlencoded)
        if request.form or request.files:
            # Content-Type is multipart/form-data or application/x-www-form-urlencoded
            data = request.form.to_dict()
            
            # Parse JSON fields that come as strings in FormData
            if 'messages' in data:
                try:
                    data['messages'] = json.loads(data['messages'])
                except (json.JSONDecodeError, TypeError):
                    data['messages'] = []
            
            if 'historicalStats' in data:
                try:
                    data['historicalStats'] = json.loads(data['historicalStats'])
                except (json.JSONDecodeError, TypeError):
                    data['historicalStats'] = None
            
            if 'currentState' in data:
                try:
                    data['currentState'] = json.loads(data['currentState'])
                except (json.JSONDecodeError, TypeError):
                    data['currentState'] = {}
            
            # Extract uploaded files
            uploaded_files = []
            for i in range(100):  # Support up to 100 files
                file_key = f'file_{i}'
                if file_key in request.files:
                    file = request.files[file_key]
                    if file and file.filename:
                        try:
                            # Read file content
                            file_content = file.read()
                            file_name = file.filename
                            file_size = len(file_content)
                            
                            # Try to decode as text for text files
                            try:
                                text_content = file_content.decode('utf-8', errors='replace')
                            except:
                                # For binary files, encode as base64
                                text_content = f"[Binary file: {file_name}]\n"
                                text_content += f"Base64 encoded content (first 500 chars):\n"
                                text_content += base64.b64encode(file_content[:500]).decode('ascii')
                            
                            uploaded_files.append({
                                'name': file_name,
                                'size': file_size,
                                'content': text_content
                            })
                            print(f"✅ Processed uploaded file: {file_name} ({file_size} bytes)")
                        except Exception as e:
                            print(f"⚠️ Error processing file {file_key}: {e}")
            
            print(f"🔵 Received FormData request with {len(data)} fields and {len(uploaded_files)} files")
        
        elif request.is_json:
            # Content-Type is application/json - safe to access request.json
            try:
                data = request.json if request.json else {}
            except Exception as e:
                print(f"⚠️ Failed to parse JSON: {e}")
                data = {}
        
        else:
            # No form data and not JSON - try to handle gracefully
            data = {}
            print(f"⚠️ No form data or JSON. Content-Type: {request.content_type}")
        
        messages = data.get('messages', [])
        simulation_name = data.get('simulation', 'default')
        simulation_data = data.get('currentState') or {}
        if isinstance(simulation_data, str):
            try:
                simulation_data = json.loads(simulation_data)
            except json.JSONDecodeError:
                print("⚠️ Failed to parse currentState payload; using empty context")
                simulation_data = {}
        screenshot = data.get('screenshot')
        state_json = data.get('stateJSON')  # Get the state JSON attachment
        snapshot_summary = data.get('snapshotSummary')
        historical_stats = data.get('historicalStats')
        if isinstance(historical_stats, str):
            try:
                historical_stats = json.loads(historical_stats)
            except json.JSONDecodeError:
                print("⚠️ Failed to parse historicalStats payload")
                historical_stats = None
        stream = data.get('stream', True)
        
        print(f"\n🔵 === NEW CHAT REQUEST ===")
        print(f"🔵 Simulation: {simulation_name}")
        print(f"🔵 Messages: {len(messages)}")
        print(f"🔵 Has screenshot: {bool(screenshot)}")
        print(f"🔵 Has stateJSON: {bool(state_json)}")
        print(f"🔵 Has snapshot summary: {bool(snapshot_summary)}")
        if historical_stats:
            print(f"🔵 Historical stats samples: {historical_stats.get('dataPoints', 'n/a')}")
        if state_json:
            try:
                parsed = json.loads(state_json)
                print(f"🔵 State JSON preview: time={parsed.get('time')}, bodies={len(parsed.get('bodies', []))}")
            except:
                print(f"🔵 State JSON size: {len(state_json)} chars")
        
        if not messages:
            return jsonify({'error': 'No messages provided'}), 400
        
        # Build conversation with system prompt
        system_prompt = get_system_prompt(simulation_name, simulation_data, historical_stats)
        conversation = [{'role': 'system', 'content': system_prompt}]
        
        if snapshot_summary:
            conversation.append({
                'role': 'system',
                'content': f"Latest live snapshot summary:\n{snapshot_summary}"
            })
        
        # Add user messages
        for msg in messages:
            if msg.get('role') in ['user', 'assistant']:
                content = msg.get('content', '')
                
                # If this is the latest user message, add attachments
                if msg.get('role') == 'user' and msg == messages[-1]:
                    # Prepare content parts
                    content_parts = []
                    
                    # Add state JSON as text if provided
                    if state_json:
                        try:
                            parsed_state = json.loads(state_json)
                            json_text = "\n\n📋 **FULL SIMULATION STATE (JSON)**:\n```json\n"
                            json_text += json.dumps(parsed_state, indent=2)
                            json_text += "\n```\n\nThis shows ALL current simulation data including:\n"
                            json_text += f"- {len(parsed_state.get('bodies', []))} bodies with complete position/velocity data\n"
                            json_text += f"- Time: {parsed_state.get('time', 0):.2f}s\n"
                            json_text += f"- Energy: {parsed_state.get('energy', 0):.4f}\n"
                            json_text += "Use this EXACT data in your analysis!\n"
                            content = content + json_text
                            print(f"✅ Added state JSON to prompt ({len(json_text)} chars)")
                        except Exception as e:
                            print(f"⚠️ Failed to parse state JSON: {e}")
                    
                    # If screenshot provided, use vision API
                    if screenshot:
                        processed_image = process_image(screenshot)
                        if processed_image:
                            content_parts = [
                                {'type': 'text', 'text': content},
                                {'type': 'image_url', 'image_url': {'url': processed_image, 'detail': 'high'}}
                            ]
                            conversation.append({
                                'role': 'user',
                                'content': content_parts
                            })
                            print(f"✅ Added screenshot with vision API")
                        else:
                            conversation.append({'role': 'user', 'content': content})
                            print(f"⚠️ Screenshot processing failed, text only")
                    else:
                        conversation.append({'role': 'user', 'content': content})
                        print(f"✅ Added text-only message")
                else:
                    conversation.append({'role': msg['role'], 'content': content})
        
        # Streaming response
        if stream:
            def generate():
                print(f"🔵 Preparing stream for model {MODEL} with {len(conversation)} messages")
                last_preview = normalize_text_fragment(conversation[-1].get('content'))[:100]
                print(f"🔵 Last user message preview: {last_preview}...")
                
                try:
                    print(f"🔵 Attempting responses endpoint...")
                    upstream_response = call_openai_responses(conversation, stream=True)
                except Exception as exc:
                    error_text = f"Responses API connection failed: {exc}"
                    print(f"🔴 {error_text}")
                    yield format_sse({'error': error_text})
                    yield "data: [DONE]\n\n"
                    return
                
                try:
                    with closing(upstream_response) as response_stream:
                        summary = yield from pump_responses_stream(response_stream)
                        if summary.get('content_chunks', 0) > 0:
                            print(f"✅ Responses API succeeded with {summary['content_chunks']} content chunks")
                            yield "data: [DONE]\n\n"
                        else:
                            yield format_sse({'error': 'Responses API returned no content'})
                            yield "data: [DONE]\n\n"
                except Exception as stream_exc:
                    import traceback
                    trace = traceback.format_exc()
                    error_text = f"Responses API stream error: {stream_exc}"
                    print(f"🔴 {error_text}")
                    print(trace)
                    yield format_sse({'error': error_text})
                    yield "data: [DONE]\n\n"
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no'
                }
            )
        
        # Non-streaming response
        else:
            providers = [
                ('responses', call_openai_responses, 'responses'),
                ('chat', call_openai_chat, 'chat')
            ]
            errors = []
            attempt_summaries = []
            
            for provider_name, caller, kind in providers:
                attempt_summary = {'provider': provider_name, 'streaming': False}
                try:
                    response = caller(conversation, stream=False)
                except Exception as exc:
                    error_text = f"{provider_name} request failed: {exc}"
                    print(f"🔴 {error_text}")
                    errors.append(error_text)
                    attempt_summary.update({
                        'status': 'error',
                        'stage': 'request',
                        'message': str(exc)
                    })
                    attempt_summaries.append(attempt_summary)
                    continue
                
                with closing(response):
                    try:
                        response_json = response.json()
                    except ValueError as exc:
                        error_text = f"{provider_name} JSON decode error: {exc}"
                        print(f"🔴 {error_text}")
                        errors.append(error_text)
                        attempt_summary.update({
                            'status': 'error',
                            'stage': 'decode',
                            'message': str(exc)
                        })
                        attempt_summaries.append(attempt_summary)
                        continue
                
                if kind == 'responses':
                    output_blocks = response_json.get('output', [])
                    text_content = extract_text_from_output_blocks(output_blocks)
                else:
                    text_content = ""
                    if 'choices' in response_json and response_json['choices']:
                        message = response_json['choices'][0].get('message', {})
                        text_content = message.get('content', '')
                
                usage = response_json.get('usage', {})
                usage_summary = {
                    'prompt_tokens': usage.get('prompt_tokens'),
                    'completion_tokens': usage.get('completion_tokens'),
                    'total_tokens': usage.get('total_tokens')
                } if usage else {}
                
                if text_content:
                    attempt_summary.update({
                        'status': 'success',
                        'content_length': len(text_content),
                        'usage': usage_summary
                    })
                    attempt_summaries.append(attempt_summary)
                    print(f"✅ {provider_name} endpoint succeeded (non-streaming): {attempt_summary}")
                    return jsonify({
                        'content': text_content,
                        'model': MODEL,
                        'diagnostic': attempt_summaries,
                        'usage': {
                            'prompt_tokens': usage.get('prompt_tokens'),
                            'completion_tokens': usage.get('completion_tokens'),
                            'total_tokens': usage.get('total_tokens')
                        }
                    })
                
                warning_text = f"{provider_name} endpoint returned empty content"
                print(f"⚠️ {warning_text}")
                errors.append(warning_text)
                attempt_summary.update({
                    'status': 'empty',
                    'content_length': 0,
                    'usage': usage_summary
                })
                attempt_summaries.append(attempt_summary)
            
            error_msg = " | ".join(errors) if errors else "All OpenAI requests failed."
            return jsonify({'error': error_msg, 'diagnostic': attempt_summaries}), 502
    
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/clear-context', methods=['POST'])
def clear_context():
    """Clear conversation context (client-side operation confirmed)"""
    return jsonify({'status': 'context_cleared'})

if __name__ == '__main__':
    # Check for API key
    if not os.getenv('OPENAI_API_KEY'):
        print("ERROR: OPENAI_API_KEY not found in environment!")
        print("Please create a .env file with your OpenAI API key.")
        print("See .env.example for template.")
        exit(1)
    
    host = os.getenv('LLM_SERVER_HOST', 'localhost')
    port = int(os.getenv('LLM_SERVER_PORT', '5001'))
    
    print(f"\n{'='*60}")
    print(f"Gravitation³ LLM Chatbot Server")
    print(f"{'='*60}")
    print(f"Model: {MODEL}")
    print(f"Server: http://{host}:{port}")
    print(f"Endpoint: http://{host}:{port}/api/chat")
    print(f"{'='*60}\n")
    
    app.run(host=host, port=port, debug=False, threaded=True)
