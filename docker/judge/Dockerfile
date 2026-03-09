# ═══════════════════════════════════════════════════════════════════════════════
# Judge Sandbox — Python 3.13, C++ 17, Java 17, C# (Mono)
# Base: Ubuntu 22.04 + Isolate Sandbox
# ═══════════════════════════════════════════════════════════════════════════════

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1: System base + tools (wget/curl needed for next stages)
# ─────────────────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    pkg-config \
    libcap-dev \
    libsystemd-dev \
    software-properties-common \
    ca-certificates \
    gnupg \
    wget \
    curl \
    apt-transport-https \
    time \
    && rm -rf /var/lib/apt/lists/*

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2: Add repos (Python 3.13 PPA, Node 20, Mono)
# ─────────────────────────────────────────────────────────────────────────────

# Python 3.13 — deadsnakes PPA
RUN add-apt-repository ppa:deadsnakes/ppa -y

# Mono (C# compiler mcs + runtime) — official Mono repo
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 \
    --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF \
    && echo "deb https://download.mono-project.com/repo/ubuntu stable-focal main" \
    > /etc/apt/sources.list.d/mono-official-stable.list

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 3: Install all language runtimes
# ─────────────────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.13 \
    python3.13-dev \
    python3.13-venv \
    g++-12 \
    openjdk-17-jdk-headless \
    mono-mcs \
    mono-runtime \
    libmono-system4.0-cil \
    && rm -rf /var/lib/apt/lists/*

# Set g++-12 as default g++/gcc
RUN update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 100 \
    && update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 100

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 4: Build Isolate from source (IOI official sandbox)
# ─────────────────────────────────────────────────────────────────────────────
RUN git clone --depth=1 https://github.com/ioi/isolate.git /tmp/isolate \
    && cd /tmp/isolate \
    && make -j$(nproc) install \
    && rm -rf /tmp/isolate

# Configure isolate to use Docker-compatible cgroup path
RUN sed -i 's|^cg_root.*|cg_root = /sys/fs/cgroup|' /usr/local/etc/isolate \
    || echo "cg_root = /sys/fs/cgroup" >> /usr/local/etc/isolate

# Verify isolate is installed
RUN test -f /usr/local/bin/isolate && isolate --version

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 5: Security hardening
# Remove network tools AFTER all downloads
# ─────────────────────────────────────────────────────────────────────────────
RUN rm -f /usr/bin/wget /usr/bin/curl /usr/bin/nc /usr/bin/ncat \
    /usr/bin/telnet /usr/bin/ftp

# Non-root user for potential future use
RUN useradd -m -s /bin/bash judgeuser

# Working directory
RUN mkdir -p /sandbox && chmod 755 /sandbox
RUN mkdir -p /var/local/lib/isolate && chmod 777 /var/local/lib/isolate

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 6: Python packages for Django/Celery worker
# ─────────────────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python3.13 -m ensurepip --upgrade \
    && python3.13 -m pip install --no-cache-dir setuptools wheel \
    && python3.13 -m pip install --no-cache-dir \
    celery \
    requests \
    redis \
    django-redis \
    psycopg2-binary \
    django \
    djangorestframework \
    django-cors-headers \
    drf-yasg \
    gunicorn \
    django-environ \
    djangorestframework-simplejwt \
    pillow \
    django-extensions

# Pre-compile Python stdlib for faster first-run
RUN python3.13 -m compileall /usr/lib/python3.13/ 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 7: JVM + Mono tuning
# ─────────────────────────────────────────────────────────────────────────────
ENV JAVA_OPTS="-server -XX:+TieredCompilation -XX:TieredStopAtLevel=1"
ENV MONO_GC_PARAMS="max-heap-size=256m"

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 8: Verify all compilers
# ─────────────────────────────────────────────────────────────────────────────
RUN echo '=== Compiler Verification ===' \
    && python3.13 --version \
    && g++ --version | head -1 \
    && java --version 2>&1 | head -1 \
    && mcs --version 2>&1 | head -1 \
    && mono --version 2>&1 | head -1 \
    && isolate --version \
    && echo '=== All compilers OK ==='

WORKDIR /app

CMD ["bash", "-c", \
    "mount -o remount,rw /sys/fs/cgroup 2>/dev/null || true && \
    python3.13 -m celery -A config worker --loglevel=info --pool=solo --concurrency=1"]