FROM maven:3.8.6-eclipse-temurin-17 as builder
WORKDIR /workspace
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src src
RUN mvn package -DskipTests && \
    test -f /workspace/target/ceialmilk-1.0.0.jar && \
    cp /workspace/target/ceialmilk-1.0.0.jar /workspace/target/app.jar

FROM eclipse-temurin:17-jre-alpine

# Cria usuário não-root
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Diretório de trabalho
WORKDIR /app

# Copia o JAR da aplicação
COPY --from=builder --chown=appuser:appuser /workspace/target/app.jar app.jar

# Expõe a porta da aplicação
EXPOSE 8080

# Comando para executar a aplicação
USER appuser
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "/app.jar"]
