from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

SpeakerName = Literal["Alex (Staff SRE)", "Sam (Builder)"]
SessionStatus = Literal["DRAFT", "MIXING", "COMPLETED"]

DEFAULT_PAN: dict[str, float] = {"Alex (Staff SRE)": -0.6, "Sam (Builder)": 0.6}


class Stem(BaseModel):
    stem_id: str
    speaker: SpeakerName
    voice_id: str
    text: str
    emotion: str = "neutral"
    file_path: str
    start_ms: int = Field(ge=0)
    duration_ms: int = Field(ge=0)
    overlap_ms: int = 0
    pan: float = Field(ge=-1.0, le=1.0)


class SfxCue(BaseModel):
    cue_id: str
    sfx_id: str
    trigger_after_stem_id: str
    timestamp_ms: int = Field(ge=0)
    gain_db: float = -3.0


class AudioMetrics(BaseModel):
    integrated_lufs: float
    true_peak_dbtp: float
    loudness_range_lu: float
    render_time_ms: int


class TimelineManifest(BaseModel):
    session_id: str
    title: str
    bpm: int = 95
    bgm_track_id: str = "lofi_synth_bed"
    total_duration_ms: int = 0
    status: SessionStatus = "DRAFT"
    stems: list[Stem] = Field(default_factory=list)
    sfx_cues: list[SfxCue] = Field(default_factory=list)
    metrics: Optional[AudioMetrics] = None
    output_path: Optional[str] = None

    def stem(self, stem_id: str) -> Stem:
        for s in self.stems:
            if s.stem_id == stem_id:
                return s
        raise KeyError(f"Unknown stem_id {stem_id!r}")
