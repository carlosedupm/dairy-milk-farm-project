FROM eclipse-temurin:17-jre-alpine

# Cria usuário não-root
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Diretório de trabalho
WORKDIR /app

# Copia o JAR da aplicação
COPY --chown=appuser:appuser target/ceialmilk-1.0.0.jar app.jar

# Expõe a porta da aplicação
EXPOSE 8080

# Comando para executar a aplicação
USER appuser
ENTRYPOINT ["java", "-jar", "/app.jar"]
