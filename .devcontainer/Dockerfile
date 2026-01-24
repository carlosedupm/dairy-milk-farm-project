# CeialMilk Dev Container - Go + Next.js (conforme techContext.md)
# Stack: Go 1.21+, Node 20 LTS, PostgreSQL client
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=${USER_UID}

# Go 1.21
ARG GO_VERSION=1.21.13
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz \
    && tar -C /usr/local -xzf /tmp/go.tar.gz \
    && rm /tmp/go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/home/${USERNAME}/go"
ENV PATH="${GOPATH}/bin:${PATH}"

# Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Ferramentas de desenvolvimento
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    postgresql-client \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Permissões (base image já cria vscode)
RUN chown -R ${USER_UID}:${USER_GID} /workspace
USER ${USERNAME}

CMD ["sleep", "infinity"]
