export type SoundEvent = 'commit' | 'tick' | 'star' | 'rewind' | 'tool' | 'setback' | 'stamp' | 'select';
export const soundEvents: Record<SoundEvent, { frequency:number; endFrequency?:number; duration:number; wave:OscillatorType; gain:number }> = {
  commit:{frequency:96,duration:.13,wave:'triangle',gain:.7},
  tick:{frequency:620,duration:.09,wave:'sine',gain:.35},
  star:{frequency:740,endFrequency:940,duration:.24,wave:'sine',gain:.48},
  rewind:{frequency:180,endFrequency:90,duration:.18,wave:'sine',gain:.42},
  tool:{frequency:360,duration:.12,wave:'sine',gain:.32},
  setback:{frequency:130,endFrequency:105,duration:.15,wave:'triangle',gain:.24},
  stamp:{frequency:112,duration:.1,wave:'triangle',gain:.52},
  select:{frequency:420,duration:.07,wave:'sine',gain:.2},
};
