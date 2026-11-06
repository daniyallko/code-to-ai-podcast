import pytest

from src import server
from src.dsp_engine import build_filter_complex, has_ffmpeg


def _session():
    sid = server.create_session("PR #402 Roast")["session_id"]
    a = server.append_dialogue_stem(sid, "Sam (Builder)", "af_bella", "We replaced Redis locks with a dict!")
    b = server.append_dialogue_stem(sid, "Alex (Staff SRE)", "am_michael", "Across forty pods?", overlap_ms=-220)
    return sid, a, b


def test_negative_overlap_moves_start_earlier():
    sid, a, b = _session()
    assert b["start_ms"] == a["start_ms"] + a["duration_ms"] - 220
    assert b["pan"] == -0.6 and a["pan"] == 0.6


def test_sfx_cue_follows_stem():
    sid, a, _ = _session()
    cue = server.insert_sfx_cue(sid, "pager_alert", a["stem_id"], offset_ms=100)
    assert cue["timestamp_ms"] == a["start_ms"] + a["duration_ms"] + 100


def test_filtergraph_contains_dsp_chain():
    sid, _, b = _session()
    fc, bgm_idx = build_filter_complex(server.SESSIONS[sid])
    assert f"adelay={b['start_ms']}|{b['start_ms']}" in fc
    assert "pan=stereo|c0=0.8*c0|c1=0.2*c0" in fc
    assert "sidechaincompress=threshold=0.03:ratio=6.0:attack=50:release=600" in fc
    assert "loudnorm=I=-16.0:TP=-1.5:LRA=11" in fc
    assert bgm_idx == 2


@pytest.mark.skipif(not has_ffmpeg(), reason="ffmpeg not installed")
def test_render_hits_target_loudness():
    sid, _, _ = _session()
    res = server.render_master_mix(sid)
    assert res["status"] == "COMPLETED"
    assert abs(res["metrics"]["integrated_lufs"] - -16.0) < 2.0
