using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace LedoBeam.Hubs;

/// <summary>
/// LEDO-Beam Signaling Server. 
/// Acts ONLY as a router for WebRTC connection data. File data never touches this server.
/// </summary>
public class SignalingHub : Hub
{
    // Thread-safe dictionary to track which connection belongs to which room
    private static readonly ConcurrentDictionary<string, string> UserRooms = new();

    public async Task JoinRoom(string roomId)
    {
        // Add user to the SignalR group corresponding to the 6-digit room code
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        UserRooms.TryAdd(Context.ConnectionId, roomId);

        // Notify any existing peer in the room that a new peer has connected
        await Clients.OthersInGroup(roomId).SendAsync("PeerJoined", Context.ConnectionId);
    }

    public async Task SendSignal(string signal, string roomId)
    {
        // This is the core engine. It routes stringified JSON containing SDP Offers, 
        // SDP Answers, and ICE Candidates directly to the other peer in the room.
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveSignal", Context.ConnectionId, signal);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Cleanup memory and notify the room when a user closes the browser
        if (UserRooms.TryRemove(Context.ConnectionId, out string roomId))
        {
            await Clients.Group(roomId).SendAsync("PeerDisconnected", Context.ConnectionId);
        }
        await base.OnDisconnectedAsync(exception);
    }
}