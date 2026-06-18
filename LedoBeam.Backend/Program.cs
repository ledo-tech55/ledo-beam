using System.Threading.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using LedoBeam.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Kestrel Protections for 8GB VPS (Isolates from your 10 other sites)
builder.WebHost.ConfigureKestrel(options =>
{
    // Hardcap to prevent OS socket exhaustion 
    options.Limits.MaxConcurrentConnections = 5000;
    options.Limits.MaxConcurrentUpgradedConnections = 5000;
});

// 2. CORS Policy (Required for the React frontend to connect)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Replaces AllowAnyOrigin for SignalR compatibility
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR /negotiate
    });
});

// 3. SignalR Setup with Memory Limits
builder.Services.AddSignalR(options =>
{
    // Increased to 32KB because standard SDP Offers often exceed 2KB-4KB
    options.MaximumReceiveMessageSize = 32768;
});
// Optional: Append .AddMessagePackProtocol() after installing the NuGet package for binary compression

// 4. IP-Based Rate Limiting Middleware
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 20, // Max 20 connections/requests per IP...
                Window = TimeSpan.FromMinutes(1) // ...per minute
            }));
});

var app = builder.Build();

app.UseRateLimiter();
app.UseCors("AllowFrontend");

// Map the WebSocket Hub
app.UseWebSockets();
app.MapHub<SignalingHub>("/signaling");

app.Run();