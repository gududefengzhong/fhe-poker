// Sound effects manager
// Using Web Audio API for simple sound effects
// In production, you could use actual audio files

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Card dealing sound
  dealCard() {
    this.playTone(800, 0.1, "square");
  }

  // Chip betting sound
  bet() {
    this.playTone(600, 0.15, "triangle");
    setTimeout(() => this.playTone(650, 0.1, "triangle"), 50);
  }

  // Fold sound
  fold() {
    this.playTone(300, 0.2, "sawtooth");
  }

  // Check sound
  check() {
    this.playTone(500, 0.1, "sine");
  }

  // Call sound
  call() {
    this.playTone(700, 0.15, "sine");
  }

  // Raise sound
  raise() {
    this.playTone(800, 0.1, "sine");
    setTimeout(() => this.playTone(1000, 0.15, "sine"), 100);
  }

  // Win sound
  win() {
    this.playTone(523, 0.15, "sine"); // C
    setTimeout(() => this.playTone(659, 0.15, "sine"), 150); // E
    setTimeout(() => this.playTone(784, 0.3, "sine"), 300); // G
  }

  // Game start sound
  gameStart() {
    this.playTone(440, 0.1, "sine"); // A
    setTimeout(() => this.playTone(554, 0.1, "sine"), 100); // C#
    setTimeout(() => this.playTone(659, 0.2, "sine"), 200); // E
  }

  // Button click sound
  click() {
    this.playTone(1000, 0.05, "square");
  }

  // Error sound
  error() {
    this.playTone(200, 0.3, "sawtooth");
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Hook for React components
export function useSounds() {
  return soundManager;
}
