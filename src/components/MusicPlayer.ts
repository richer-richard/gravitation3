/**
 * MusicPlayer — ambient music player for the simulation experience.
 * Minimalist floating widget with play/pause, volume, and track info.
 */

interface Track {
  title: string;
  artist: string;
  src: string;
}

const TRACKS: Track[] = [
  {
    title: "barnes blvd",
    artist: "joan of arc.",
    src: "/music/joan of arc. - barnes blvd.mp3",
  },
];

export class MusicPlayer {
  private audio: HTMLAudioElement;
  private widget: HTMLElement | null = null;
  private currentTrack = 0;
  private playing = false;

  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = 0.3;
  }

  mount(parent: HTMLElement = document.body): void {
    this.widget = document.createElement("div");
    this.widget.className =
      "fixed bottom-4 left-4 z-40 bg-zinc-800/90 backdrop-blur border border-zinc-700/50 rounded-lg px-3 py-2 flex items-center gap-3 text-xs shadow-lg";

    this.widget.innerHTML = `
      <button class="music-toggle text-zinc-400 hover:text-zinc-200 transition-colors text-sm w-6 text-center">
        &#9654;
      </button>
      <div class="music-info text-zinc-500 max-w-[150px] truncate">
        ${TRACKS[0]?.title || "No tracks"}
      </div>
      <input type="range" class="music-volume w-16 h-1 accent-blue-500 cursor-pointer" min="0" max="100" value="30" />
      <button class="music-close text-zinc-600 hover:text-zinc-400 transition-colors">&times;</button>
    `;

    parent.appendChild(this.widget);

    const toggleBtn = this.widget.querySelector(".music-toggle")!;
    const volumeSlider = this.widget.querySelector(".music-volume") as HTMLInputElement;
    const closeBtn = this.widget.querySelector(".music-close")!;

    toggleBtn.addEventListener("click", () => {
      if (this.playing) {
        this.pause();
        toggleBtn.innerHTML = "&#9654;";
      } else {
        this.play();
        toggleBtn.innerHTML = "&#9646;&#9646;";
      }
    });

    volumeSlider.addEventListener("input", () => {
      this.audio.volume = parseInt(volumeSlider.value) / 100;
    });

    closeBtn.addEventListener("click", () => {
      this.unmount();
    });
  }

  play(): void {
    if (TRACKS.length === 0) return;
    const track = TRACKS[this.currentTrack];
    if (this.audio.src !== track.src) {
      this.audio.src = track.src;
    }
    this.audio.play().catch(() => {
      // Autoplay blocked — user needs to interact first
    });
    this.playing = true;
  }

  pause(): void {
    this.audio.pause();
    this.playing = false;
  }

  unmount(): void {
    this.pause();
    this.widget?.remove();
    this.widget = null;
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  destroy(): void {
    this.unmount();
    this.audio.src = "";
  }
}
