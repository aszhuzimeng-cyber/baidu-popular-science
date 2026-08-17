import type { VisionMode } from './params.js';
import { NARRATION_SCRIPTS, type NarrationCue } from './texts.js';

let enabled = true;
let preferredVoice: SpeechSynthesisVoice | null = null;
let finishCurrent: (() => void) | null = null;
let activeAudio: HTMLAudioElement | null = null;
let narrationGeneration = 0;

export interface SpeakNarrationOptions {
  maxWaitMs?: number;
}

const FALLBACK_AUDIO_BY_CUE: Record<NarrationCue, string> = {
  intro: 'assets/audio/narration/intro.mp3',
  normal: 'assets/audio/narration/normal.mp3',
  blur: 'assets/audio/narration/blur.mp3',
  misalignment: 'assets/audio/narration/misalignment.mp3',
  occlusion: 'assets/audio/narration/occlusion.mp3',
};

const FALLBACK_AUDIO_BY_TEXT = new Map<string, string>([
  ['已切换为左眼异常。', 'assets/audio/narration/affected-left.wav'],
  ['已切换为右眼异常。', 'assets/audio/narration/affected-right.wav'],
]);

function supportsSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function supportsFallbackAudio(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const uri = voice.voiceURI.toLowerCase();
  const lang = voice.lang.toLowerCase().replace(/_/g, '-');
  const text = `${name} ${uri}`;

  if (!lang.startsWith('zh') && !/chinese|mandarin|putonghua/.test(text)) return -1000;

  let score = 0;
  if (lang === 'zh-cn' || lang.startsWith('zh-cn')) score += 80;
  else if (lang.startsWith('zh')) score += 45;

  if (/xiaoxiao|xiaoyi|yunxia|xiaochen|xiaohan|xiaomeng|xiaorui|xiaoshuang/.test(text)) {
    score += 220;
  }
  if (/tingting|ting-ting|meijia|mei-jia|sinji|sin-ji|yushu|yu-shu|limu|li-mu/.test(text)) {
    score += 170;
  }
  if (/female|女/.test(text)) score += 120;
  if (/natural|neural|online/.test(text)) score += 110;
  if (/google/.test(text)) score += 55;
  if (/microsoft/.test(text)) score += 35;

  if (/kangkang|kang kang|yunxi|yunjian|yunyang|yunfeng|yunhao|david|mark|richard|male|男/.test(text)) {
    score -= 260;
  }
  if (/desktop|huihui|hui hui|yaoyao|compact|basic|espeak/.test(text)) {
    score -= 80;
  }

  return score;
}

function pickChineseVoice(): void {
  if (!supportsSpeech()) return;
  const voices = speechSynthesis.getVoices();
  const ranked = voices
    .map((voice) => ({ voice, score: scoreVoice(voice) }))
    .filter((entry) => entry.score > -100)
    .sort((a, b) => b.score - a.score);

  preferredVoice =
    ranked[0]?.voice ??
    voices.find((v) => v.lang === 'zh-CN') ??
    voices.find((v) => v.lang.startsWith('zh')) ??
    voices.find((v) => /chinese|中文|mandarin|putonghua/i.test(`${v.name} ${v.voiceURI}`)) ??
    null;
}

if (supportsSpeech()) {
  pickChineseVoice();
  speechSynthesis.addEventListener('voiceschanged', pickChineseVoice);
}

function finishSpeaking(): void {
  if (!finishCurrent) return;
  const done = finishCurrent;
  finishCurrent = null;
  done();
}

function estimateSpeechMs(text: string): number {
  return Math.max(2800, text.length * 195);
}

function stopFallbackAudio(): void {
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}

export function isNarrationEnabled(): boolean {
  return enabled;
}

export function setNarrationEnabled(value: boolean): void {
  enabled = value;
  if (!value) stopNarration();
}

export function stopNarration(): void {
  narrationGeneration += 1;
  stopActiveNarration();
}

function stopActiveNarration(): void {
  stopFallbackAudio();
  if (supportsSpeech()) speechSynthesis.cancel();
  finishSpeaking();
}

export function primeNarrationOnGesture(): void {
  if (!supportsSpeech()) return;
  speechSynthesis.resume();
  pickChineseVoice();
}

async function playFallbackAudio(src: string): Promise<boolean> {
  if (!supportsFallbackAudio()) return false;

  stopFallbackAudio();
  const audio = document.createElement('audio');
  audio.src = src;
  audio.preload = 'auto';
  activeAudio = audio;

  return new Promise((resolve) => {
    let settled = false;
    const done = (success: boolean) => {
      if (settled) return;
      settled = true;
      if (finishCurrent === finish) finishCurrent = null;
      if (activeAudio === audio) activeAudio = null;
      resolve(success);
    };
    const finish = () => done(true);

    finishCurrent = finish;
    audio.onended = finish;
    audio.onerror = () => done(false);
    audio.play().catch(() => done(false));
  });
}

function waitForVoicesBriefly(): Promise<void> {
  if (!supportsSpeech() || speechSynthesis.getVoices().length > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.setTimeout(() => {
      pickChineseVoice();
      resolve();
    }, 160);
  });
}

async function speakText(text: string): Promise<boolean> {
  if (!supportsSpeech()) return Promise.resolve(false);

  await waitForVoicesBriefly();
  pickChineseVoice();

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = 0.92;
    utter.pitch = 1.06;
    if (preferredVoice) utter.voice = preferredVoice;

    let settled = false;
    let started = false;
    const done = (success: boolean) => {
      if (settled) return;
      settled = true;
      if (finishCurrent === finish) finishCurrent = null;
      clearTimeout(fallbackTimer);
      resolve(success);
    };
    const finish = () => done(started);

    finishCurrent = finish;
    utter.onstart = () => {
      started = true;
    };
    utter.onend = () => done(true);
    utter.onerror = () => done(false);

    const fallbackTimer = window.setTimeout(() => done(started), estimateSpeechMs(text));
    speechSynthesis.resume();
    speechSynthesis.speak(utter);
  });
}

export async function speakNarration(
  cue: NarrationCue,
  _options: SpeakNarrationOptions = {}
): Promise<boolean> {
  if (!enabled) return false;

  const text = NARRATION_SCRIPTS[cue];
  if (!text) return false;

  const generation = ++narrationGeneration;
  stopActiveNarration();

  const recorded = await playFallbackAudio(FALLBACK_AUDIO_BY_CUE[cue]);
  if (generation !== narrationGeneration) return false;
  if (recorded) return true;

  return speakText(text);
}

export async function speakNarrationText(
  text: string,
  _options: SpeakNarrationOptions = {}
): Promise<boolean> {
  const trimmed = text.trim();
  if (!enabled || !trimmed) return false;

  const generation = ++narrationGeneration;
  stopActiveNarration();
  const spoken = await speakText(trimmed);
  if (generation !== narrationGeneration) return false;
  if (spoken) return true;

  const fallbackAudio = FALLBACK_AUDIO_BY_TEXT.get(trimmed);
  return fallbackAudio ? playFallbackAudio(fallbackAudio) : false;
}

export function narrationCueForMode(mode: VisionMode): NarrationCue {
  return mode;
}
