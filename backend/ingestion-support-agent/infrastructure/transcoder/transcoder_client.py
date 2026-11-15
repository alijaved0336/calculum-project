"""Managed video compression via the GCP Transcoder API (GCS → GCS).

Submits a job that reads the uploaded original and writes a compressed H.264/AAC mp4 to
``videos/<video_id>.mp4``. The job is tagged with ``labels["video_id"]`` and its completion
is published to a Pub/Sub topic so the backend can mark the video ``ready``.
"""
from __future__ import annotations

import logging

from config import settings

logger = logging.getLogger(__name__)


def _service():
    from google.cloud.video.transcoder_v1.services.transcoder_service import (
        TranscoderServiceClient,
    )

    return TranscoderServiceClient()


def submit_compress_job(
    input_uri: str, output_dir: str, video_id: str, crf: int, height: int, pubsub_topic: str | None
) -> str:
    """Create a Transcoder job (input original → compressed ``<video_id>.mp4`` in output_dir).

    Returns the job resource name. ``height=0`` keeps the source resolution.
    """
    from google.cloud.video import transcoder_v1 as t

    h264 = t.VideoStream.H264CodecSettings(
        crf_level=int(crf),
        rate_control_mode="crf",
        # Required by the API even in CRF mode: it's the ceiling, CRF drives the real bitrate.
        bitrate_bps=int(settings.video_transcode_bitrate_bps),
        height_pixels=int(height) if height else 0,  # 0 = keep source
        width_pixels=0,
        frame_rate=30,
    )
    config = t.JobConfig(
        elementary_streams=[
            t.ElementaryStream(key="video", video_stream=t.VideoStream(h264=h264)),
            t.ElementaryStream(
                key="audio", audio_stream=t.AudioStream(codec="aac", bitrate_bps=128000)
            ),
        ],
        mux_streams=[
            t.MuxStream(
                key="hd", file_name=f"{video_id}.mp4", container="mp4",
                elementary_streams=["video", "audio"],
            )
        ],
    )
    if pubsub_topic:
        config.pubsub_destination = t.PubsubDestination(topic=pubsub_topic)

    job = t.Job(
        input_uri=input_uri, output_uri=output_dir, config=config, labels={"video_id": video_id}
    )
    parent = f"projects/{settings.gcp_project_id}/locations/{settings.gcp_transcoder_location}"
    created = _service().create_job(parent=parent, job=job)
    logger.info("transcoder.job_created name=%s video_id=%s input=%s", created.name, video_id, input_uri)
    return created.name


def get_job(name: str):
    return _service().get_job(name=name)


def job_video_id(job) -> str | None:
    return (getattr(job, "labels", None) or {}).get("video_id")


def job_state(job) -> str:
    state = getattr(job, "state", None)
    return state.name if hasattr(state, "name") else str(state)
