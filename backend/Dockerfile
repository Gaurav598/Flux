FROM gradle:8.5.0-jdk17 AS build
WORKDIR /app

COPY build.gradle settings.gradle ./
COPY src src

RUN gradle clean build --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent --show-error http://localhost:8080/ || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
