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

FROM eclipse-temurin:17-jre-alpine

# Cria usuário não-root
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Diretório de trabalho
WORKDIR /app

# Copia o JAR da aplicação
COPY --from=builder --chown=appuser:appuser /workspace/target/app.jar app.jar

# Expõe a porta da aplicação
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Comando para executar a aplicação
USER appuser
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "/app/app.jar"]
