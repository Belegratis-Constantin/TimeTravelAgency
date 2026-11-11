using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Service;

/// <summary>
/// Moves trips through their time-driven lifecycle while the API runs:
/// Scheduled → Active at departure, Active → Completed at return.
/// </summary>
public class TripLifecycleService : BackgroundService
{
    public static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TripLifecycleService> _logger;

    public TripLifecycleService(IServiceScopeFactory scopeFactory, ILogger<TripLifecycleService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>Applies all due transitions. Returns the number of trips whose status changed.</summary>
    public static int SyncStatuses(TimeTravelAgencyContext context, DateTime utcNow)
    {
        var changed = context.Trips
            .Where(t => t.TripStatus == TripStatus.Scheduled || t.TripStatus == TripStatus.Active)
            .ToList()
            .Count(t => t.SyncStatus(utcNow));

        if (changed > 0) context.SaveChanges();
        return changed;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<TimeTravelAgencyContext>();
                var changed = SyncStatuses(context, DateTime.UtcNow);
                if (changed > 0) _logger.LogInformation("Trip lifecycle: {Count} trip(s) changed status.", changed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Trip lifecycle tick failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
