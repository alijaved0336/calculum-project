import os

# Settings read .env, which carries real Langfuse keys: without this every test
# run would ship traces (and prompts) to the Langfuse project.
os.environ.setdefault("LANGFUSE_TRACING_ENABLED", "false")
