# Estágio de Build
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Estágio de Flyway (CLI)
FROM flyway/flyway:10 AS flyway-cli

# Estágio Final (Debian para melhor resolução de DNS)
FROM eclipse-temurin:17-jdk
WORKDIR /app

# Instalar dependências básicas
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar Flyway CLI completo
COPY --from=flyway-cli /flyway /app/flyway

# Copiar artefatos da aplicação
COPY --from=build /app/target/*.jar app.jar
COPY --from=build /app/src/main/resources/db/migration /app/migrations
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Criar usuário não-root por segurança
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
