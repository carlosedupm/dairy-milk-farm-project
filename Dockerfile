# Dockerfile na raiz do monorepo — usado pelo Render (dockerfilePath: ./Dockerfile, dockerContext: .)
# Build do backend CeialMilk API

FROM golang:1.25-alpine AS build

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api ./cmd/api

# Pinado em minor para builds reprodutíveis (atualizar conscientemente)
FROM alpine:3.22

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=build /app/bin/api .
COPY backend/migrations ./migrations

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

CMD ["./api"]
