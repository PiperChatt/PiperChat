
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

namespace SignalingServer;

partial class UserStatusNotifier : BackgroundService
{
    private IHubContext<SignalHub> _signalHub { get; }

    public UserStatusNotifier(IHubContext<SignalHub> signalHub)
    {
        _signalHub = signalHub;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            System.Console.WriteLine("UserStatusNotifier running");
            foreach (var (userId, userData) in SignalHub.Connections)
            {
                var friendListResult = new List<FriendStatus>();
                foreach (var friend in userData.Friends)
                {
                    if (SignalHub.Connections.TryGetValue(friend, out var friendUser))
                    {
                        friendListResult.Add(new FriendStatus { FriendId = friend, Status = "online" });
                    }
                    else
                    {
                        friendListResult.Add(new FriendStatus { FriendId = friend, Status = "offline" });
                    }
                }
                var friendListJson = JsonSerializer.Serialize(friendListResult);

                await _signalHub.Clients.Group(userId).SendAsync("FriendsStatus", friendListJson, stoppingToken);
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
