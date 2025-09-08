FROM eclipse-temurin:17-jre-alpine

# Instala curl para health checks
RUN apk add --no-cache curl

# Diretório de trabalho
WORKDIR /app

# Copia o JAR da aplicação
COPY target/*.jar app.jar

# Expõe a porta da aplicação
EXPOSE 8080

# Health check para verificar se a aplicação está respondendo
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Comando para executar a aplicação
ENTRYPOINT ["java", "-jar", "/app.jar"]
