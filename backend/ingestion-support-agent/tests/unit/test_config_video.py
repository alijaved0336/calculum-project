from config import Settings, settings


def test_video_config_defaults():
    # Assert CODE defaults (independent of any local .env override, e.g. COLLECTION_VIDEO_CHUNKS).
    assert Settings.model_fields["collection_video_chunks"].default == "video-chunks-v2"
    assert set(settings.allowed_transcript_ext) >= {".vtt", ".srt", ".json"}


def test_compression_disabled_by_default():
    # Priority fix: compression is OFF by default so videos ≥ video_compress_min_bytes are stored
    # as-is and reach "ready"/indexed. Enabling it strands them at "compressing" until the
    # Transcoder completion webhook is wired. Guard against a silent regression of the default.
    assert Settings.model_fields["video_compress_enabled"].default is False
