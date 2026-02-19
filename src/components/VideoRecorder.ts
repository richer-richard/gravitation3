/**
 * VideoRecorder — records the simulation canvas to WebM video.
 * Uses the MediaRecorder API with canvas.captureStream().
 */

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recording = false;
  private canvas: HTMLCanvasElement | null = null;

  isRecording(): boolean {
    return this.recording;
  }

  start(canvas: HTMLCanvasElement, fps = 30): boolean {
    if (this.recording) return false;

    this.canvas = canvas;
    this.chunks = [];

    try {
      const stream = canvas.captureStream(fps);
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveRecording();
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.recording = true;
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (!this.recording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.recording = false;
  }

  private saveRecording(): void {
    if (this.chunks.length === 0) return;

    const mimeType = this.mediaRecorder?.mimeType || "video/webm";
    const blob = new Blob(this.chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = url;
    a.download = `gravitation3-recording-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    this.chunks = [];
  }

  private getSupportedMimeType(): string {
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "video/webm";
  }

  destroy(): void {
    this.stop();
    this.mediaRecorder = null;
    this.canvas = null;
    this.chunks = [];
  }
}
