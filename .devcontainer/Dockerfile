FROM mcr.microsoft.com/devcontainers/java:1-17-bullseye

# Configuração do usuário
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Instalações essenciais
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    postgresql-client \
    redis-tools \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configura Maven
ARG MAVEN_VERSION=3.9.6
RUN curl -fsSL -o /tmp/maven.tar.gz https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
    && tar -xzf /tmp/maven.tar.gz -C /usr/share \
    && mv /usr/share/apache-maven-${MAVEN_VERSION} /usr/share/maven \
    && ln -s /usr/share/maven/bin/mvn /usr/bin/mvn \
    && rm /tmp/maven.tar.gz

# Variáveis de ambiente
ENV MAVEN_HOME=/usr/share/maven
ENV JAVA_HOME=/usr/lib/jvm/msopenjdk-current
ENV PATH="${MAVEN_HOME}/bin:${PATH}"

# Configurações do projeto
ENV SPRING_PROFILES_ACTIVE=dev

# Diretório de trabalho
WORKDIR /workspace

# Permissões
RUN chown -R $USER_UID:$USER_GID /workspace
USER $USERNAME

# Health check simplificado - verifica apenas se o container está respondendo
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD echo "Container healthy" || exit 0

# Comando para manter o container rodando
CMD ["sleep", "infinity"]
