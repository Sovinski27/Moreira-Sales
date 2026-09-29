// Web Audio API Sound Synthesizer para Cozinha (KDS)
// Não depende de arquivos externos .mp3, funciona 100% offline em qualquer navegador

class KitchenSoundAlarm {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isAlarmPlaying: boolean = false;
  private isAudioUnlocked: boolean = false;

  public init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isAudioUnlocked = true;
      }).catch(e => console.warn('Falha ao desbloquear áudio:', e));
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isAudioUnlocked = true;
    }
  }

  public isUnlocked(): boolean {
    return this.isAudioUnlocked && !!this.ctx && this.ctx.state === 'running';
  }

  public playSingleAlertBeep() {
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      
      // Tom agudo chamativo (Beep duplo de cozinha de restaurante)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // Nota Lá (A5)
      osc1.frequency.setValueAtTime(1174.66, now + 0.12); // Nota Ré (D6)

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(587.33, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Erro ao emitir som:', e);
    }
  }

  public startContinuousAlarm() {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;
    this.init();
    this.playSingleAlertBeep();

    this.intervalId = setInterval(() => {
      this.playSingleAlertBeep();
    }, 1100);
  }

  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const kitchenAlarm = new KitchenSoundAlarm();
