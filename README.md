# Gravitation³ ✨

### Watch Chaos Come to Life in Your Browser

Ever wondered what happens when celestial bodies dance through space, or how the flutter of a butterfly's wings can change tomorrow's weather? **Gravitation³** brings these mind-bending concepts to life through beautiful, interactive 3D simulations you can experience right in your web browser!

---

## 🌟 What is This?

Imagine being able to play with the forces that govern our universe – from the motion of planets to the swirls of a hurricane. This project lets you do exactly that! No physics degree required, no complicated software to download. Just open a webpage and start exploring the fascinating world of chaos theory.

**Think of it as:**
- 🎮 A playground for cosmic simulations
- 🎨 An interactive art piece powered by physics
- 🔬 A learning tool that makes complex science beautiful
- 🌌 Your personal universe in a browser tab

---

## 🚀 Getting Started (It's Super Easy!)

1. **Download or clone this project** to your computer
2. **Open `web/index.html`** in your favorite web browser (Chrome, Firefox, Safari, or Edge)
3. **Click "Explore Sims"** to see all the cool simulations
4. **Pick one that looks interesting** and hit the Start button
5. **Watch the magic happen!** ✨

That's it! Seriously. No installation, no complicated setup, no Python or other programming tools needed. If you can open a webpage, you're good to go.

### 🤖 Optional: AI Assistant + Live Data Backend

The simulations run fully client-side, but the **AI assistant** (chat + vision) and **live data enrichment** can optionally run via local backend services.

1. Create a Python venv + install backend deps:
   ```bash
   python3 -m venv venv
   ./venv/bin/pip install -r api/requirements.txt
   ```
2. Configure `api/.env`:
   ```bash
   cp api/.env.example api/.env
   ```
3. Start servers:
   ```bash
   ./app.py
   ```

### ✅ Recommended for AI: Dev Mode (backend + local web server)

If you want the most reliable experience (and to avoid `file://` browser limitations), run:

```bash
./scripts/start_dev.sh
```

Then open: `http://localhost:8000/web/index.html`

See `docs/LIVE_DATA_ACCESS_GUIDE.md` for more details and troubleshooting.

---

## 🌐 Browser Compatibility

The simulators rely on WebGL, Web Workers, WebAssembly, and modern pointer/keyboard APIs. We officially support the latest versions of:

- **Chrome / Edge** 90+
- **Firefox** 88+
- **Safari** 15+

If you're on an older browser (or have WebGL disabled), the new `shared/browser-support.js` helper will surface a warning banner explaining which features are missing and how to resolve the issue. See `docs/BROWSER_SUPPORT.md` for troubleshooting tips and testing notes.

---

## 🎯 What Can You Explore?

### 🌌 Three-Body Problem
**What it is:** Watch three celestial objects orbit each other in a cosmic dance.

Ever wondered why predicting the motion of three planets is so hard? This simulation shows you exactly why! Tiny changes create wildly different outcomes – that's chaos theory in action. Try the famous "Figure-8" orbit where three equal masses chase each other perfectly, or experiment with your own configurations to create unique space ballets.

### 🦋 Lorenz Attractor (The Butterfly Effect)
**What it is:** The original "butterfly effect" - where tiny changes lead to dramatically different results.

This simulation, inspired by Edward Lorenz's weather research, shows how a system that looks random is actually following hidden patterns. Watch as the trails create a beautiful butterfly shape while never repeating the same path twice. It's mesmerizing and mind-bending!

### ⚛️ Double Pendulum
**What it is:** A pendulum attached to another pendulum – simple to build, impossible to predict.

You've seen a single pendulum swing back and forth predictably. But add a second pendulum to the first, and suddenly you get wildly chaotic motion! Start it twice from *almost* the same position and watch completely different dances unfold. It's hypnotic to watch.

### ✨ Clifford Attractor
**What it is:** Mathematical equations that create stunning, fractal-like art.

This one is pure visual poetry. Watch as simple mathematical rules create intricate, symmetrical patterns that look like they were designed by an alien artist. Each parameter change creates an entirely new masterpiece.

###  Rössler Attractor
**What it is:** A simple system that creates beautiful spiral chaos.

With just three simple equations, this system creates endlessly spiraling patterns that never quite repeat. It's elegant, hypnotic, and a perfect introduction to strange attractors.

---

## 🎮 Cool Features You'll Love

### 🖱️ **Play With Physics**
- Drag objects around with your mouse
- Adjust speeds, masses, and starting positions
- See what happens when you change the rules of physics!

### 🎬 **Watch in Real-Time 3D**
- Smooth, beautiful graphics powered by your graphics card
- Colorful particle trails that show where objects have been
- Rotate and zoom to see from any angle

### 💾 **Save & Share**
- Save your favorite configurations
- Export your simulations to share with friends
- Import preset configurations to explore famous scenarios

### 🎵 **Relaxing Ambiance**
- Chill background music (with easy volume control!)
- Smooth animations and professional design
- Perfect for zoning out and watching the chaos unfold

---

## 🤔 "But I Don't Know Physics..."

**That's totally okay!** You don't need to understand the math to enjoy these simulations. Think of them like:

- **A lava lamp** – you don't need to know about convection currents to enjoy watching it
- **A kaleidoscope** – you don't need to understand mirrors to be amazed by the patterns
- **Fireworks** – you don't need to know chemistry to go "ooooh!"

These simulations are the same. They're beautiful, mesmerizing, and fascinating whether you understand the science or not. And if you *do* want to learn more, they're a perfect visual way to explore complex concepts!

---

## 🎓 For the Curious Minds

### What Makes These Simulations "Chaotic"?

In science, "chaos" doesn't mean random – it means systems that are **extremely sensitive to their starting conditions**. Imagine:

- Two butterflies flapping their wings exactly the same way, just a hair's breadth apart
- A month later, one creates a hurricane and the other doesn't
- *That's* chaos!

These simulations show this sensitivity beautifully. Start two objects at almost the same spot, and watch them diverge into completely different paths.

### How Accurate Are These?

Very! These simulations use advanced numerical methods (fancy math techniques) to calculate physics accurately. The same math that NASA uses for space missions, just running in your browser instead of a supercomputer.

### Can I Learn From This?

Absolutely! Whether you're:
- 📚 A student learning about physics or mathematics
- 👨‍🏫 A teacher looking for engaging demonstrations
- 🧑‍💻 A developer wanting to see physics in action
- 🎨 An artist seeking algorithmic inspiration
- 🤓 Just someone who thinks science is cool

These simulations make abstract concepts tangible and beautiful!

---

## 💻 Technical Stuff (For the Geeks)

Don't worry – you can skip this section if you just want to play! This is for folks who want to know how it works under the hood.

### What Powers This?

- **Pure JavaScript** – Everything runs in your browser, no server needed
- **Three.js** – A 3D graphics library that makes things look pretty
- **RK4 Integration** – A mathematical method for accurate physics simulation
- **WebGL** – Uses your graphics card for smooth, fast rendering

### Can I Modify It?

Yes! The code is designed to be readable and modifiable. Each simulation is self-contained, so you can:
- Tweak the physics equations
- Change colors and visual effects  
- Add new preset configurations
- Create entirely new simulations

The code is organized logically:
- `simulator.js` = The physics calculations
- `visualizer.js` = The 3D graphics rendering
- `app.js` = Connects everything together

---

## 🎁 Who Made This?

This project was created as a labor of love to make complex physics concepts accessible and beautiful for everyone. Whether you're 8 or 80, whether you love math or just love pretty pictures, there's something here for you!

### Want to Contribute?

Found a bug? Have an idea for a new simulation? Want to improve the documentation? Contributions are welcome! This project is open source and thrives on community input.

---

## 🌈 Final Thoughts

Science doesn't have to be intimidating. Sometimes, the most complex phenomena in the universe can be appreciated simply for their beauty. These simulations are a window into the hidden patterns that govern everything from planetary orbits to the swirls in your coffee.

So go ahead – click that Start button, adjust some parameters, and lose yourself in the mesmerizing dance of chaos. You might just discover that physics is a lot more fun than you thought!

**Ready to explore? Open `web/index.html` and let the journey begin!** 🚀

---

## 📜 License

MIT License - This means you're free to use, modify, and share this project however you like! Use it for school projects, teach with it, remix it into something new – the possibilities are endless.

### Enjoy Your Journey Through Chaos! ✨🌌

*"God doesn't play dice, Einstein assured us… and yet, the dice keep rolling."*
