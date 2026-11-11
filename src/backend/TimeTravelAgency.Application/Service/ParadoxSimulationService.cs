using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TimeTravelAgency.Application.Service;

/// <summary>
/// "Time itself": periodically tears a random paradox into one of the active trips while the API runs.
/// Interval and on/off switch live in <see cref="ParadoxSimulationState"/> and can be changed at runtime.
/// </summary>
public class ParadoxSimulationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ParadoxSimulationState _state;
    private readonly ILogger<ParadoxSimulationService> _logger;

    public ParadoxSimulationService(
        IServiceScopeFactory scopeFactory,
        ParadoxSimulationState state,
        ILogger<ParadoxSimulationService> logger)
    {
        _scopeFactory = scopeFactory;
        _state = state;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var changed = _state.Changed;

            if (!_state.Enabled)
            {
                await changed.WaitAsync(stoppingToken);
                continue;
            }

            var interval = _state.Interval;
            _state.ScheduleNext(interval);

            var delay = Task.Delay(interval, stoppingToken);
            var finished = await Task.WhenAny(delay, changed);
            stoppingToken.ThrowIfCancellationRequested();

            // Settings changed mid-wait: re-plan with the new values instead of spawning.
            if (finished == changed) continue;

            SpawnOnce();
        }
    }

    private void SpawnOnce()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var paradoxService = scope.ServiceProvider.GetRequiredService<ParadoxService>();
            var result = paradoxService.SpawnRandomParadox();

            if (result == null)
            {
                _logger.LogDebug("Paradox simulation: no active trip available.");
                return;
            }

            _state.RecordSpawn();
            _logger.LogInformation("Paradox simulation: {Type} appeared on trip {Trip}.",
                result.Paradox.ParadoxType, result.Paradox.TripName ?? result.Paradox.TripGuid.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Paradox simulation tick failed.");
        }
    }
}
