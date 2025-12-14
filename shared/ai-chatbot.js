/**
 * Gravitation³ AI Chatbot
 * Integrates GPT-5 with vision support for simulation analysis
 * Enhanced with history management, code execution, and data visualization
 */

class AIChat {
    constructor() {
        this.config = {
            apiEndpoint: 'http://localhost:5001/api/chat',
            healthEndpoint: 'http://localhost:5001/api/health',
            maxMessages: 50,
            storagePrefix: 'gravitation3_chat_',
            historyPrefix: 'gravitation3_history_',
            screenshotQuality: 0.8,
            enableScreenshots: true,
            maxHistoryPoints: 500
        };
        
        this.state = {
            isOpen: false,
            isConnected: false,
            isTyping: false,
            messages: [],
            simulationName: '',
            dataSource: null,
            currentAssistantMessage: '',
            currentConversationId: null,
            historyPanelOpen: false,
            attachmentMenuOpen: false
        };
        
        this.dataHistory = {
            time: [],
            energy: [],
            momentum: [],
            positions: [],
            velocities: [],
            parameters: []
        };
        
        this.elements = {};
        this.currentScreenshot = null;
        this.currentAttachment = null;
        this.attachments = [];
        this.liveStateAttachment = null;
        this.typingIndicator = null;
        this.typingIndicatorReasoningEl = null;
        this.reasoningBuffer = '';
        this.lastUsage = null;
        this.mathRendererInitialized = false;
        this.mathRendererReady = typeof window !== 'undefined' && !!window.MathJax;
        this.mathRenderQueue = [];
        this.diagnosticLog = [];
        this.init();
    }
    
    async init() {
        this.createUI();
        this.attachEventListeners();
        this.ensureMathRenderer();
        await this.checkHealth();
        this.startHistoryTracking();
        setInterval(() => this.checkHealth(), 30000);
    }
    
    startHistoryTracking() {
        setInterval(() => {
            if (this.state.dataSource) {
                this.recordDataPoint();
            }
        }, 100);
    }
    
    recordDataPoint() {
        try {
            const data = this.getSimulationData();
            this.dataHistory.time.push(data.time);
            this.dataHistory.energy.push(data.energy);
            
            let totalMomentum = [0, 0, 0];
            data.bodies.forEach(b => {
                totalMomentum[0] += b.velocity[0] * b.mass;
                totalMomentum[1] += b.velocity[1] * b.mass;
                totalMomentum[2] += b.velocity[2] * b.mass;
            });
            const momentumMag = Math.sqrt(totalMomentum[0]**2 + totalMomentum[1]**2 + totalMomentum[2]**2);
            this.dataHistory.momentum.push(momentumMag);
            
            data.bodies.forEach((body, i) => {
                if (!this.dataHistory.positions[i]) {
                    this.dataHistory.positions[i] = { name: body.name, x: [], y: [], z: [] };
                    this.dataHistory.velocities[i] = { name: body.name, vx: [], vy: [], vz: [] };
                }
                this.dataHistory.positions[i].x.push(body.position[0]);
                this.dataHistory.positions[i].y.push(body.position[1]);
                this.dataHistory.positions[i].z.push(body.position[2]);
                this.dataHistory.velocities[i].vx.push(body.velocity[0]);
                this.dataHistory.velocities[i].vy.push(body.velocity[1]);
                this.dataHistory.velocities[i].vz.push(body.velocity[2]);
            });
            
            const maxLen = this.config.maxHistoryPoints;
            if (this.dataHistory.time.length > maxLen) {
                this.dataHistory.time = this.dataHistory.time.slice(-maxLen);
                this.dataHistory.energy = this.dataHistory.energy.slice(-maxLen);
                this.dataHistory.momentum = this.dataHistory.momentum.slice(-maxLen);
                this.dataHistory.positions.forEach(p => {
                    p.x = p.x.slice(-maxLen); p.y = p.y.slice(-maxLen); p.z = p.z.slice(-maxLen);
                });
                this.dataHistory.velocities.forEach(v => {
                    v.vx = v.vx.slice(-maxLen); v.vy = v.vy.slice(-maxLen); v.vz = v.vz.slice(-maxLen);
                });
            }
        } catch (e) {}
    }
    
    getHistoricalStatistics() {
        if (this.dataHistory.time.length < 10) return { available: false };
        const n = this.dataHistory.time.length;
        const energyArr = this.dataHistory.energy;
        const momentumArr = this.dataHistory.momentum;
        return {
            available: true,
            dataPoints: n,
            timeSpan: this.dataHistory.time[n-1] - this.dataHistory.time[0],
            energy: { current: energyArr[n-1], average: energyArr.reduce((a,b) => a+b) / n },
            momentum: { current: momentumArr[n-1], average: momentumArr.reduce((a,b) => a+b) / n },
            trajectories: this.dataHistory.positions.map((pos, i) => ({
                body: pos.name,
                pathLength: this.calculatePathLength(pos),
                avgSpeed: this.calculateAverageSpeed(this.dataHistory.velocities[i])
            }))
        };
    }
    
    calculatePathLength(pos) {
        let length = 0;
        for (let i = 1; i < pos.x.length; i++) {
            const dx = pos.x[i] - pos.x[i-1], dy = pos.y[i] - pos.y[i-1], dz = pos.z[i] - pos.z[i-1];
            length += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
        return length;
    }
    
    calculateAverageSpeed(vel) {
        let sum = 0;
        for (let i = 0; i < vel.vx.length; i++) sum += Math.sqrt(vel.vx[i]**2 + vel.vy[i]**2 + vel.vz[i]**2);
        return sum / vel.vx.length;
    }
    
    configure(options = {}) {
        this.state.simulationName = options.simulationName || 'Simulation';
        this.state.dataSource = options.dataSource || null;
        this.updateWelcomeMessage();
    }
    
    updateWelcomeMessage() {
        const welcome = this.elements.messages?.querySelector('.welcome-message');
        if (!welcome) return;
        const content = this.getSimulationContent();
        const examplesHtml = content.examples ? `<div class="example-prompts">${content.examples.map(ex => `<button class="example-prompt" data-prompt="${ex.q}">${ex.icon} ${ex.q}</button>`).join('')}</div>` : '';
        welcome.innerHTML = `<div class="welcome-icon">🤖</div><h3>${content.title}</h3><p>${content.description}</p><ul>${content.capabilities.map(c => `<li>${c}</li>`).join('')}</ul>${examplesHtml}`;
        
        // Add click listeners to example prompts - send message directly
        welcome.querySelectorAll('.example-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.input.value = e.target.dataset.prompt;
                // Auto-resize textarea
                this.autoResizeTextarea();
                // Send message directly
                setTimeout(() => this.sendMessage(), 100);
            });
        });
    }
    
    autoResizeTextarea() {
        const textarea = this.elements.input;
        // Reset to min height to get accurate scrollHeight
        textarea.style.height = 'auto';
        // Set to scrollHeight to fit content
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
    getSimulationContent() {
        const simName = this.state.simulationName.toLowerCase();
        const content = {
            'three-body': { 
                title: 'Three-Body Problem', 
                description: 'Explore the fundamental limits of gravitational mechanics through three mutually interacting celestial bodies, where deterministic laws give rise to unpredictable trajectories.', 
                capabilities: ['🌍 N-body orbital mechanics', '💫 Deterministic chaos theory', '📊 Conservation laws', '🎯 Periodic & quasi-periodic orbits'],
                examples: [
                    { q: 'Analyze the sensitivity of this trajectory to initial perturbations', icon: '🌀' },
                    { q: 'How do the Lagrange points constrain possible stable configurations?', icon: '♾️' },
                    { q: 'Compare energy dissipation rates across different mass ratios', icon: '📍' }
                ]
            },
            'lorenz-attractor': { 
                title: 'Lorenz System', 
                description: 'A foundational model in chaos theory demonstrating how simplified atmospheric convection equations reveal sensitive dependence on initial conditions and the emergence of strange attractors.', 
                capabilities: ['🦋 Sensitive dependence & Lyapunov exponents', '🌀 Chaotic transients & transient chaos', '📊 Phase space topology', '⚙️ Parametric bifurcations'],
                examples: [
                    { q: 'Calculate the fractal dimension and estimate the Hausdorff dimension of this attractor', icon: '🦋' },
                    { q: 'How does the ratio of Rayleigh to Prandtl numbers affect the transition to chaos?', icon: '⚙️' },
                    { q: 'Identify the periodic windows and their stability properties within the chaotic regime', icon: '🌀' }
                ]
            },
            'double-pendulum': { 
                title: 'Double Pendulum', 
                description: 'A classical system exemplifying how nonlinear coupling in coupled oscillators produces chaotic motion despite perfect energy conservation, offering insight into Hamiltonian chaos.', 
                capabilities: ['⚙️ Nonlinear coupled oscillations', '💫 Energy conservation in chaotic systems', '📊 Action-angle variables', '🌊 Separatrix crossing dynamics'],
                examples: [
                    { q: 'Quantify the basin of attraction for different periodic orbits and identify separation boundaries', icon: '🌀' },
                    { q: 'How does the coupling strength between segments modulate the onset of chaos?', icon: '⚡' },
                    { q: 'Map the phase space regions where predictability persists versus regions of strong chaos', icon: '🎯' }
                ]
            },
            'rossler-attractor': { 
                title: 'Rössler System', 
                description: 'A minimalist three-dimensional dynamical system designed to exhibit chaos through simpler mechanisms than Lorenz, revealing how topology and folding generate complex dynamics in reduced systems.', 
                capabilities: ['🌀 Strange attractor geometry & folding', '📈 Bifurcation cascades & period-doubling', '⚙️ Multiple timescale dynamics', '🔀 Symbolic dynamics & kneading sequences'],
                examples: [
                    { q: 'Construct a first-return map and analyze the Poincaré section to understand the attractor structure', icon: '🌀' },
                    { q: 'Trace the period-doubling route to chaos and quantify the Feigenbaum constant across parameter space', icon: '⚙️' },
                    { q: 'Determine the spectrum of Lyapunov exponents and their relationship to the attractor dimension', icon: '🔀' }
                ]
            },
            'double-gyre': { 
                title: 'Double Gyre', 
                description: 'A paradigm model in fluid dynamics and geophysical flow demonstrating how time-periodic forcing creates intricate Lagrangian coherent structures that govern transport and mixing in rotating systems.', 
                capabilities: ['🌊 Lagrangian-Eulerian flow decomposition', '📊 Finite-time Lyapunov exponents (FTLE)', '🌀 Dynamical systems approach to transport', '⚙️ Coherent structure identification'],
                examples: [
                    { q: 'Compute finite-time Lyapunov exponents to identify manifolds controlling transport barriers', icon: '🌊' },
                    { q: 'How do periodic oscillations in the forcing amplitude alter the topology of material transport?', icon: '🌀' },
                    { q: 'Analyze the mixing efficiency and compare Lagrangian vs. Eulerian perspectives on vortex dynamics', icon: '🌍' }
                ]
            },
            'malkus-waterwheel': { 
                title: 'Malkus Waterwheel', 
                description: 'A mechanical realization of the Lorenz equations through a driven turbine, elegantly demonstrating how fluid torques and inertia create deterministic chaos in a physical system accessible to direct observation.', 
                capabilities: ['💧 Rotational fluid mechanics', '🌀 Spontaneous reversals & transitions', '⚙️ Homoclinic & heteroclinic structures', '📊 Dimensionality reduction techniques'],
                examples: [
                    { q: 'Model the coupling between fluid inertia and gravitational torque to predict reversal thresholds', icon: '🔄' },
                    { q: 'Compare the system\'s behavior to canonical Lorenz dynamics and quantify deviations', icon: '🌀' },
                    { q: 'Identify the critical Reynolds numbers where chaotic reversals emerge from periodic motion', icon: '⚙️' }
                ]
            }
        };
        return content[simName] || { 
            title: 'AI Assistant', 
            description: 'Explore complex dynamical systems through interactive simulation and real-time analysis.', 
            capabilities: ['📷 Visual analysis & screenshots', '💬 Natural language interaction', '📊 Real-time metrics'],
            examples: [
                { q: 'Characterize the dynamical regime and identify key bifurcations', icon: '❓' },
                { q: 'What invariant structures govern the long-term behavior?', icon: '🔍' }
            ]
        };
    }
    
    createUI() {
        // Create floating button
        const btn = document.createElement('button');
        btn.id = 'ai-chat-button';
        btn.className = 'ai-chat-button';
        btn.innerHTML = `<svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        btn.title = 'Open AI Chat';
        document.body.appendChild(btn);
        
        // Create panel
        const panel = document.createElement('div');
        panel.id = 'ai-chat-panel';
        panel.className = 'ai-chat-panel';
        panel.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">🤖 AI Assistant</div>
                <button class="chat-close" title="Close">✕</button>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="welcome-message">
                    <div class="welcome-icon">🤖</div>
                    <h3>Welcome</h3>
                    <p>Ask me anything about your simulation!</p>
                </div>
            </div>
            <div class="chat-input-container" id="chat-input-container">
                <div id="chat-image-preview-container" class="chat-image-preview-container"></div>
                <div id="chat-file-list" class="chat-file-list"></div>
                <div class="chat-input-row" id="chat-drag-drop-zone">
                    <button class="chat-upload-btn" id="chat-upload-btn" title="Upload file or drag & drop (Max 10MB)">+</button>
                    <textarea id="chat-input" placeholder="Ask anything... (Shift+Enter for new line, Enter to send)" rows="1"></textarea>
                    <button class="chat-send" id="chat-send" title="Send message">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16287164 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.98721575 L3.03521743,10.4282088 C3.03521743,10.5853061 3.34915502,10.7424035 3.50612381,10.7424035 L16.6915026,11.5278905 C16.6915026,11.5278905 17.1624089,11.5278905 17.1624089,12.0016722 L17.1624089,12.0016722 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <input type="file" id="file-input-chat" accept=".pdf,.doc,.docx,.rtf,.txt,.md,.epub,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.tsv,.json,.xml,.html,.py,.js,.ts,.jsx,.tsx,.css,.c,.cpp,.h,.java,.php,.sql,.r,.go,.rs,.sh,.yaml,.yml,.toml,.png,.jpg,.jpeg,.gif,.webp,.zip" />
        `;
        document.body.appendChild(panel);
        
        this.elements = {
            button: btn,
            panel: panel,
            messages: panel.querySelector('#chat-messages'),
            input: panel.querySelector('#chat-input'),
            sendBtn: panel.querySelector('#chat-send'),
            closeBtn: panel.querySelector('.chat-close'),
            uploadBtn: panel.querySelector('#chat-upload-btn'),
            fileInput: panel.querySelector('#file-input-chat'),
            fileList: panel.querySelector('#chat-file-list'),
            dragDropZone: panel.querySelector('#chat-drag-drop-zone'),
            imagePreviewContainer: panel.querySelector('#chat-image-preview-container'),
            inputContainer: panel.querySelector('#chat-input-container')
        };
    }
    
    attachEventListeners() {
        // Button click to toggle panel
        this.elements.button.addEventListener('click', () => this.togglePanel());
        
        // Close button click to close panel
        this.elements.closeBtn.addEventListener('click', () => this.togglePanel());
        
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea on input
        this.elements.input.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // File upload button
        this.elements.uploadBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        // Drag & drop support
        this.elements.dragDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.dragDropZone.classList.add('drag-over');
        });
        
        this.elements.dragDropZone.addEventListener('dragleave', () => {
            this.elements.dragDropZone.classList.remove('drag-over');
        });
        
        this.elements.dragDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.dragDropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.handleDragDropFile(files[0]);
            }
        });
    }
    
    handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
            this.addMessage('system', `⚠️ File too large. Max 10MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return;
        }
        
        // Store file info
        if (!this.attachments) this.attachments = [];
        this.attachments.push({
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        });
        
        // Update file list UI
        this.updateFileList();
        
        // Reset input
        event.target.value = '';
    }
    
    handleDragDropFile(file) {
        const maxSize = 10 * 1024 * 1024;
        
        if (file.size > maxSize) {
            this.addMessage('system', `⚠️ File too large. Max 10MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return;
        }
        
        if (!this.attachments) this.attachments = [];
        
        // Check if it's an image
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.displayImagePreview(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
        }
        
        this.attachments.push({
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        });
        
        this.updateFileList();
    }
    
    displayImagePreview(dataUrl, fileName) {
        const container = this.elements.imagePreviewContainer;
        container.innerHTML = '';
        
        const previewBubble = document.createElement('div');
        previewBubble.className = 'chat-image-preview-bubble';
        previewBubble.innerHTML = `
            <div class="image-preview-header">
                <span class="image-name">${fileName}</span>
                <button class="image-remove-btn">✕</button>
            </div>
            <img src="${dataUrl}" alt="${fileName}" class="preview-img">
        `;
        
        previewBubble.querySelector('.image-remove-btn').addEventListener('click', () => {
            this.attachments = this.attachments.filter(a => a.name !== fileName);
            this.updateFileList();
            container.innerHTML = '';
        });
        
        container.appendChild(previewBubble);
    }
    
    updateFileList() {
        const list = this.elements.fileList;
        list.innerHTML = '';
        
        this.attachments.forEach((att, idx) => {
            const item = document.createElement('div');
            item.className = 'chat-file-item';
            const sizeStr = (att.size / 1024).toFixed(1) + ' KB';
            item.innerHTML = `
                <span class="chat-file-name">${att.name}</span>
                <span class="chat-file-size">${sizeStr}</span>
                <button class="chat-file-remove" data-idx="${idx}">✕</button>
            `;
            
            item.querySelector('.chat-file-remove').addEventListener('click', () => {
                this.attachments.splice(idx, 1);
                this.updateFileList();
            });
            
            list.appendChild(item);
        });
    }
    
    togglePanel() {
        this.state.isOpen = !this.state.isOpen;
        
        if (this.state.isOpen) {
            // Show panel - only adjust canvas, NOT other elements
            this.elements.panel.classList.add('open');
            this.elements.input.focus();
        } else {
            // Hide panel
            this.elements.panel.classList.remove('open');
        }
    }
    
    async checkHealth() {
        try {
            const response = await fetch(this.config.healthEndpoint);
            const data = await response.json();
            this.state.isConnected = data.status === 'healthy';
        } catch (error) {
            this.state.isConnected = false;
        }
    }
    
    getSimulationData() {
        const data = { time: 0, energy: 0, fps: 60, bodies: [], parameters: {} };
        if (!this.state.dataSource) return data;
        try {
            const s = this.state.dataSource;
            data.time = s.time ?? 0;
            data.energy = typeof s.calculateTotalEnergy === 'function' ? s.calculateTotalEnergy() : (s.energy ?? 0);
            if (s.bodies && Array.isArray(s.bodies)) {
                data.bodies = s.bodies.map((b, i) => {
                    const vec = (v) => {
                        if (!v) return [0,0,0];
                        if (Array.isArray(v)) return v;
                        return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
                    };
                    return { name: b.name ?? `Body ${i+1}`, mass: b.mass ?? 1, position: vec(b.position), velocity: vec(b.velocity) };
                });
            }
        } catch (e) {}
        return data;
    }
    
    async sendMessage() {
        const msg = this.elements.input.value.trim();
        if (!msg && (!this.attachments || this.attachments.length === 0)) return;
        if (!this.state.isConnected) { this.addMessage('system', '⚠️ Server not connected'); return; }
        
        this.elements.input.value = '';
        
        // Display user message with file attachments
        if (this.attachments && this.attachments.length > 0) {
            this.addMessageWithAttachments(msg, this.attachments);
        } else {
            this.addMessage('user', msg);
        }
        
        this.state.isTyping = true;
        this.showTypingIndicator();
        
        try {
            // Prepare request body - use FormData if there are file attachments
            let requestBody;
            let headers = {};
            
            if (this.attachments && this.attachments.length > 0) {
                // Use FormData for multipart file upload
                const formData = new FormData();
                
                // Add message data
                formData.append('messages', JSON.stringify(
                    [
                        ...this.state.messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: msg }
                    ]
                ));
                formData.append('simulation', this.state.simulationName);
                formData.append('stream', 'true');
                
                // Add file attachments
                this.attachments.forEach((attachment, index) => {
                    formData.append(`file_${index}`, attachment.file, attachment.name);
                });
                
                requestBody = formData;
                // Don't set Content-Type header - browser will set it with boundary
            } else {
                // Use JSON for regular messages
                headers['Content-Type'] = 'application/json';
                requestBody = JSON.stringify({
                    messages: [
                        ...this.state.messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: msg }
                    ],
                    simulation: this.state.simulationName,
                    stream: true
                });
            }
            
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: requestBody
            });
            
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            if (!response.body) throw new Error('No stream');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            const msgEl = this.addMessage('assistant', '', true);
            
            while (true) {
                const { done, value } = await reader.read();
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.slice(5).trim();
                            if (data === '[DONE]') {
                                this.hideTypingIndicator();
                                this.state.isTyping = false;
                                this.state.messages.push({ role: 'assistant', content: assistantMessage });
                                
                                // Clear attachments after successful send
                                this.attachments = [];
                                this.updateFileList();
                                
                                return;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                let content = '';
                                if (parsed.choices?.[0]?.delta?.content) content = parsed.choices[0].delta.content;
                                else if (parsed.content) content = parsed.content;
                                if (content) {
                                    assistantMessage += content;
                                    this.updateMessage(msgEl, assistantMessage);
                                }
                            } catch (e) {}
                        }
                    }
                }
                if (done) break;
            }
            this.hideTypingIndicator();
            this.state.isTyping = false;
            
            // Clear attachments after successful completion
            this.attachments = [];
            this.updateFileList();
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('system', `Error: ${error.message}`);
            this.state.isTyping = false;
        }
    }
    
    addMessageWithAttachments(msg, attachments) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message user-message';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const html = this.formatMessage(msg);
        
        // Build message with image thumbnails
        let content = html;
        
        // Add image previews below text
        const images = attachments.filter(a => a.type.startsWith('image/'));
        if (images.length > 0) {
            content += '<div class="message-attachments"></div>';
        }
        
        // Add other attachments as file list
        const otherFiles = attachments.filter(a => !a.type.startsWith('image/'));
        if (otherFiles.length > 0) {
            content += '<div class="message-files">';
            otherFiles.forEach(file => {
                const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
                content += `<div class="message-file-item">📎 ${file.name} (${sizeStr})</div>`;
            });
            content += '</div>';
        }
        
        msgDiv.innerHTML = `<div class="msg-avatar">👤</div><div class="msg-bubble"><div class="message-content">${content}</div><div class="message-time">${time}</div></div>`;
        
        const welcome = this.elements.messages.querySelector('.welcome-message');
        if (welcome) welcome.remove();
        
        this.elements.messages.appendChild(msgDiv);
        
        // Load images after DOM is ready
        if (images.length > 0) {
            const attachmentContainer = msgDiv.querySelector('.message-attachments');
            images.forEach(img => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgEl = document.createElement('img');
                    imgEl.src = e.target.result;
                    imgEl.className = 'attachment-thumbnail';
                    imgEl.title = img.name;
                    attachmentContainer.appendChild(imgEl);
                };
                reader.readAsDataURL(img.file);
            });
        }
        
        this.scrollToBottom();
        
        this.state.messages.push({ role: 'user', content: msg });
        return msgDiv;
    }
    
    addMessage(role, content, isStreaming = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}-message`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const html = this.formatMessage(content);
        
        if (role === 'system') {
            msgDiv.innerHTML = `<div class="message-content system">${html}</div>`;
        } else {
            msgDiv.innerHTML = `<div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div><div class="msg-bubble"><div class="message-content">${html}</div><div class="message-time">${time}</div></div>`;
        }
        
        const welcome = this.elements.messages.querySelector('.welcome-message');
        if (welcome) welcome.remove();
        
        this.elements.messages.appendChild(msgDiv);
        this.scrollToBottom();
        
        // Attach code block event listeners
        const contentEl = msgDiv.querySelector('.message-content');
        if (contentEl) {
            this.attachCodeBlockListeners(contentEl);
            
            // Render MathJax if content has math
            if (content.includes('$')) {
                setTimeout(() => this.renderMathJax(contentEl), 100);
            }
            
            // Syntax highlight code blocks if highlight.js is available
            if (window.hljs) {
                setTimeout(() => {
                    contentEl.querySelectorAll('pre code').forEach(block => {
                        window.hljs.highlightElement(block);
                    });
                }, 50);
            }
        }
        
        if (role !== 'system' && !isStreaming) {
            this.state.messages.push({ role, content });
        }
        return msgDiv;
    }
    
    updateMessage(el, content) {
        const contentEl = el.querySelector('.message-content');
        if (contentEl) {
            contentEl.innerHTML = this.formatMessage(content);
            
            // Render MathJax if content has math
            if (content.includes('$')) {
                setTimeout(() => this.renderMathJax(contentEl), 100);
            }
            
            this.scrollToBottom();
        }
    }
    
    formatMessage(content) {
        if (!content) return '';
        
        // DON'T escape HTML entities - let math formulas pass through
        // Only escape & < > when NOT part of math
        let html = content
            .replace(/&(?!(?:[a-zA-Z]+|#[0-9]+);)/g, '&amp;')  // Escape bare ampersands
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Protect code blocks first (before any markdown processing)
        const codeBlocks = [];
        
        // FIXED: Extract language from code fences (```python, ```javascript, etc.)
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, language, code) => {
            const escapedCode = code.trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            const htmlBlock = `<pre><code class="hljs language-${language || 'text'}">${escapedCode}</code></pre>`;
            codeBlocks.push(htmlBlock);
            return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
        });
        
        // Handle inline code
        html = html.replace(/`([^`]+?)`/g, (match, code) => {
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            codeBlocks.push(`<code class="inline-code">${escapedCode}</code>`);
            return `__INLINE_CODE_${codeBlocks.length - 1}__`;
        });
        
        // Handle bold (double asterisk only) - be strict
        html = html.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
        
        // Handle italic - MUCH more conservative - only with clear delimiters
        html = html.replace(/(?:^|\s)\*([^\*\n]+?)\*(?:\s|$)/gm, ' <em>$1</em> ');
        html = html.replace(/(?:^|\s)_([^_\n]+?)_(?:\s|$)/gm, ' <em>$1</em> ');
        
        // Handle horizontal line separators
        html = html.replace(/^---+$/gm, '<hr>');
        
        // Handle headings
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        // Handle lists
        html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
        
        // Handle line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, '');
        
        // RESTORE CODE BLOCKS (now properly formatted as HTML)
        for (let i = 0; i < codeBlocks.length; i++) {
            html = html.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
            html = html.replace(`__INLINE_CODE_${i}__`, codeBlocks[i]);
        }
        
        return html;
    }
    
    escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    ensureMathRenderer() {
        if (typeof window === 'undefined' || this.mathRendererInitialized) return;
        this.mathRendererInitialized = true;
        
        // Load MathJax if not already loaded
        if (!window.MathJax) {
            window.MathJax = {
                tex: { 
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']]
                },
                svg: { fontCache: 'global' },
                startup: { 
                    pageReady: () => {
                        console.log('MathJax ready');
                    }
                }
            };
            
            const script = document.createElement('script');
            script.id = 'gravitation-mathjax';
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            script.async = true;
            script.onload = () => {
                console.log('MathJax script loaded');
                if (window.MathJax?.typesetPromise) {
                    window.MathJax.typesetPromise().catch(err => console.warn('Initial MathJax typesetPromise error:', err));
                }
            };
            document.head.appendChild(script);
        }
    }
    
    renderMathJax(element) {
        if (!element) return;
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            if (window.MathJax?.typesetPromise) {
                window.MathJax.typesetPromise([element])
                    .catch(err => console.warn('MathJax render error:', err));
            }
        }, 50);
    }
    
    showTypingIndicator() {
        if (this.typingIndicator) return;
        const ind = document.createElement('div');
        ind.className = 'typing-indicator';
        ind.innerHTML = `<div class="msg-avatar">🤖</div><div class="typing-dots"><span></span><span></span><span></span></div>`;
        this.typingIndicator = ind;
        this.elements.messages.appendChild(ind);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        if (this.typingIndicator?.parentNode) this.typingIndicator.remove();
        this.typingIndicator = null;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }, 100);
    }
    
    attachCodeBlockListeners(contentEl) {
        // Find all code blocks and wrap them with enhanced rendering
        const preElements = contentEl.querySelectorAll('pre');
        preElements.forEach((pre, idx) => {
            const code = pre.querySelector('code');
            if (!code) return;
            
            // Get language from class (highlight.js format)
            let language = 'text';
            const classList = code.className.split(' ');
            for (const cls of classList) {
                if (cls.startsWith('language-')) {
                    language = cls.replace('language-', '');
                    break;
                } else if (cls.startsWith('hljs-')) {
                    continue;
                } else if (cls !== 'hljs') {
                    language = cls;
                    break;
                }
            }
            
            const codeContent = code.textContent;
            
            // Create wrapper with enhanced UI
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-container';
            wrapper.innerHTML = `
                <div class="code-block-header">
                    <span class="code-block-lang">${language}</span>
                    <div class="code-block-actions">
                        <button class="code-copy-btn" data-code-idx="${idx}" title="Copy code">📋 Copy</button>
                        <button class="code-expand-btn" data-code-idx="${idx}" title="Expand viewer">🔍 Expand</button>
                    </div>
                </div>
                <div class="code-block-content">
                    <pre><code class="hljs language-${language}">${code.innerHTML}</code></pre>
                </div>
            `;
            
            // Add event listeners
            const copyBtn = wrapper.querySelector('.code-copy-btn');
            const expandBtn = wrapper.querySelector('.code-expand-btn');
            
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeContent).then(() => {
                    copyBtn.classList.add('copied');
                    copyBtn.textContent = '✓ Copied';
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.textContent = '📋 Copy';
                    }, 2000);
                });
            });
            
            expandBtn.addEventListener('click', () => {
                this.openCodeViewer(codeContent, language);
            });
            
            // Replace pre with wrapper
            pre.replaceWith(wrapper);
        });
    }
    
    openCodeViewer(code, language) {
        // Create or get modal
        let modal = document.getElementById('code-viewer-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'code-viewer-modal';
            modal.className = 'code-viewer-modal';
            modal.innerHTML = `
                <div class="code-viewer-content">
                    <div class="code-viewer-header">
                        <h2 class="code-viewer-title">${language.toUpperCase()} Code</h2>
                        <button class="code-viewer-close" title="Close">✕</button>
                    </div>
                    <div class="code-viewer-body">
                        <div class="code-viewer-code" id="code-viewer-code-content"></div>
                    </div>
                    <div class="code-viewer-footer">
                        <button class="code-viewer-btn" id="code-viewer-copy">📋 Copy Code</button>
                        <button class="code-viewer-btn primary" id="code-viewer-close-btn">✕ Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add event listeners
            modal.querySelector('.code-viewer-close').addEventListener('click', () => {
                modal.classList.remove('active');
            });
            modal.querySelector('#code-viewer-close-btn').addEventListener('click', () => {
                modal.classList.remove('active');
            });
            modal.querySelector('#code-viewer-copy').addEventListener('click', () => {
                const btn = modal.querySelector('#code-viewer-copy');
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '✓ Copied';
                    setTimeout(() => {
                        btn.textContent = '📋 Copy Code';
                    }, 2000);
                });
            });
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Update content
        const codeEl = modal.querySelector('#code-viewer-code-content');
        codeEl.textContent = code;
        modal.querySelector('.code-viewer-title').textContent = `${language.toUpperCase()} Code`;
        
        // Show modal
        modal.classList.add('active');
        
        // Apply syntax highlighting if available
        if (window.hljs) {
            setTimeout(() => {
                window.hljs.highlightElement(codeEl);
            }, 50);
        }
    }
    
    ensureHighlightJS() {
        if (window.hljs) return;
        
        // Load highlight.js
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        script.onload = () => {
            console.log('highlight.js loaded');
        };
        document.head.appendChild(script);
    }
}

window.AIChat = new AIChat();
if (typeof module !== 'undefined' && module.exports) module.exports = AIChat;

// Load highlight.js on initialization
setTimeout(() => {
    if (window.AIChat) {
        window.AIChat.ensureHighlightJS();
    }
}, 500);
