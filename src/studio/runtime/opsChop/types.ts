export type Chop = {
  sampleRate: number;
  numSamples: number;
  channels: Float32Array[];
};

export function makeChop(channels: number, numSamples: number, sampleRate: number): Chop {
  return {
    sampleRate,
    numSamples,
    channels: Array.from({ length: channels }, () => new Float32Array(numSamples)),
  };
}
