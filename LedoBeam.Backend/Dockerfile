# Base image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER app
WORKDIR /app
EXPOSE 8080

# Build image with SDK
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Restore dependencies first (optimizes Docker layer caching)
COPY ["LedoBeam.Backend.csproj", "."]
RUN dotnet restore "./LedoBeam.Backend.csproj"

# Copy the rest of the source code and build
COPY . .
WORKDIR "/src/."
RUN dotnet build "./LedoBeam.Backend.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish the app
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./LedoBeam.Backend.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "LedoBeam.Backend.dll"]
