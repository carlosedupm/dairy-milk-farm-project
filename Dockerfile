FROM maven:3.8.6-eclipse-temurin-17 as builder
WORKDIR /workspace

# Otimização: Copiar apenas o necessário primeiro
COPY pom.xml .
COPY src src

# Build otimizado mantendo o arquivo JAR
RUN mvn dependency:go-offline && \
    mvn package -DskipTests && \
    test -f /workspace/target/ceialmilk-*.jar && \
    cp /workspace/target/ceialmilk-*.jar /workspace/target/app.jar

# Stage para Flyway CLI
FROM flyway/flyway:10-alpine as flyway

# Stage final da aplicação
FROM eclipse-temurin:17-jre-alpine

# Flyway CLI usa bash internamente (#!/usr/bin/env bash)
RUN apk add --no-cache bash

# Cria usuário não-root
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Diretório de trabalho
WORKDIR /app

# Copia o JAR da aplicação
COPY --from=builder --chown=appuser:appuser /workspace/target/app.jar app.jar

# Copia Flyway CLI do stage flyway
COPY --from=flyway /flyway/flyway /usr/local/bin/flyway
RUN chmod +x /usr/local/bin/flyway

# Copia migrações SQL
COPY --chown=appuser:appuser src/main/resources/db/migration /app/migrations

# Copia script de inicialização
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expõe a porta da aplicação
EXPOSE 8080

# Health checks
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Comando para executar a aplicação via script de inicialização
USER appuser
ENTRYPOINT ["/app/entrypoint.sh"]
