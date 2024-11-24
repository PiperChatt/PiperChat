using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace SignalingServer;

public class User
{
    public string ConnectionId { get; set; }
    public string UserId { get; set; }
    public List<string> Friends { get; set; }
}

public class SignalHub : Hub
{
    public static ConcurrentDictionary<string, User> Connections => _connections;

    private static readonly ConcurrentDictionary<string, User> _connections = new();

    private string GetUserIdFromHeader()
    {
        var httpContext = Context.GetHttpContext();
        return httpContext.Request.Query["UserID"].ToString();
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserIdFromHeader();
        System.Console.WriteLine($"User {userId} connected. ConnectionId: {Context.ConnectionId}");
        if (!_connections.TryAdd(userId, new User { ConnectionId = Context.ConnectionId, UserId = userId, Friends = [] }))
        {
            System.Console.WriteLine($"Failed to add user {userId} to connections");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        await base.OnConnectedAsync();
        await NotifyFriendStatus(userId, "online");
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserIdFromHeader();
        await base.OnDisconnectedAsync(exception);
        if (_connections.TryRemove(userId, out var user))
        {
            System.Console.WriteLine($"User {userId} disconnected. ConnectionId: {Context.ConnectionId}");
        }

        await NotifyFriendStatus(userId, "offline");
    }

    public async Task NotifyFriendStatus(string userId, string status)
    {
        var disconectedFriendStatus = new List<FriendStatus> { new() { FriendId = userId, Status = status } };
        foreach (var (key, value) in _connections)
        {
            if (value.Friends.Contains(userId))
            {
                await Clients.Group(key).SendAsync("FriendsStatus", disconectedFriendStatus);
            }
        }
    }

    public Task ListenForFriendStatus(string friendUserId)
    {
        var userId = _connections[GetUserIdFromHeader()].UserId;
        System.Console.WriteLine($"User {userId} is listening for status of {friendUserId}");
        if (_connections.TryGetValue(userId, out var user))
        {
            user.Friends.Add(friendUserId);
        }

        return Task.CompletedTask;
    }

    public Task WebRtcSignal(string targetUserId, string signalData)
    {
        var userId = _connections[GetUserIdFromHeader()].UserId;
        System.Console.WriteLine($"User {userId} sent signal to {targetUserId}");
        return Clients.Group(targetUserId).SendAsync("WebRtcSignalReceived", userId, signalData);
    }

    public Task<List<FriendStatus>> GetFriendsStatus()
    {
        System.Console.WriteLine("GetFriendsStatus");
        var userId = _connections[GetUserIdFromHeader()].UserId;

        var friendListResult = new List<FriendStatus>();
        foreach (var friend in _connections[userId].Friends)
        {
            if (_connections.TryGetValue(friend, out var friendUser))
            {
                friendListResult.Add(new FriendStatus { FriendId = friend, Status = "online" });
            }
            else
            {
                friendListResult.Add(new FriendStatus { FriendId = friend, Status = "offline" });
            }
        }

        return Task.FromResult(friendListResult);
    }
}
