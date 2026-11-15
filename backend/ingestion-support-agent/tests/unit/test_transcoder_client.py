"""The Transcoder client builds a GCS→GCS H.264 compress job whose output lands at
videos/<video_id>.mp4, tags the job with the video_id, and wires the completion topic."""


def test_submit_compress_job_builds_config(monkeypatch):
    import infrastructure.transcoder.transcoder_client as tc

    captured = {}

    class FakeSvc:
        def create_job(self, parent, job):
            captured["parent"] = parent
            captured["job"] = job

            class _R:
                name = "projects/p/locations/us-central1/jobs/j1"

            return _R()

    monkeypatch.setattr(tc, "_service", lambda: FakeSvc())
    monkeypatch.setattr(tc.settings, "gcp_project_id", "proj")
    monkeypatch.setattr(tc.settings, "gcp_transcoder_location", "us-central1")

    name = tc.submit_compress_job(
        input_uri="gs://b/uploads/v1.mp4", output_dir="gs://b/videos/",
        video_id="v1", crf=20, height=1080, pubsub_topic="projects/p/topics/t",
    )
    assert name == "projects/p/locations/us-central1/jobs/j1"
    assert captured["parent"] == "projects/proj/locations/us-central1"

    job = captured["job"]
    assert job.input_uri == "gs://b/uploads/v1.mp4"
    assert job.output_uri == "gs://b/videos/"
    assert job.labels["video_id"] == "v1"
    mux = job.config.mux_streams[0]
    assert mux.file_name == "v1.mp4" and mux.container == "mp4"
    h264 = job.config.elementary_streams[0].video_stream.h264
    assert h264.crf_level == 20
    # Transcoder requires bitrate_bps even in CRF mode (it's the ceiling) — must be > 0.
    assert h264.bitrate_bps > 0
    assert job.config.pubsub_destination.topic == "projects/p/topics/t"


def test_job_video_id_and_state():
    import infrastructure.transcoder.transcoder_client as tc
    from google.cloud.video import transcoder_v1 as t

    job = t.Job(labels={"video_id": "abc"}, state=t.Job.ProcessingState.SUCCEEDED)
    assert tc.job_video_id(job) == "abc"
    assert tc.job_state(job) == "SUCCEEDED"
