using TimeTravelAgency.Application.Dto;

namespace TimeTravelAgency.Application.Service;

/// <summary>
/// Runtime-adjustable state of the paradox simulation. Registered as a singleton and shared
/// between the background service and the API so settings can be changed while the app runs.
/// </summary>
public class ParadoxSimulationState
{
    public const int MinIntervalSeconds = 5;
    public const int MaxIntervalSeconds = 3600;

    private readonly object _lock = new();
    private readonly TimeProvider _time;
    private TaskCompletionSource _changed = NewSignal();

    private bool _enabled;
    private int _intervalSeconds;
    private DateTime? _nextSpawnAt;
    private DateTime? _lastSpawnAt;
    private int _totalSpawned;

    public ParadoxSimulationState(ParadoxSimulationOptions options, TimeProvider? time = null)
    {
        _time = time ?? TimeProvider.System;
        _enabled = options.Enabled;
        _intervalSeconds = Clamp(options.IntervalSeconds);
    }

    public bool Enabled { get { lock (_lock) return _enabled; } }
    public TimeSpan Interval { get { lock (_lock) return TimeSpan.FromSeconds(_intervalSeconds); } }

    /// <summary>Completes as soon as the settings change, so the background loop can re-plan immediately.</summary>
    public Task Changed { get { lock (_lock) return _changed.Task; } }

    public ParadoxSimulationDto Snapshot()
    {
        lock (_lock)
            return new ParadoxSimulationDto(_enabled, _intervalSeconds, _enabled ? _nextSpawnAt : null, _lastSpawnAt, _totalSpawned);
    }

    public void Update(bool? enabled, int? intervalSeconds)
    {
        TaskCompletionSource previous;
        lock (_lock)
        {
            if (enabled.HasValue) _enabled = enabled.Value;
            if (intervalSeconds.HasValue) _intervalSeconds = Clamp(intervalSeconds.Value);
            // The background loop re-plans immediately; mirror its schedule so the snapshot is never stale.
            _nextSpawnAt = _enabled ? _time.GetUtcNow().UtcDateTime.AddSeconds(_intervalSeconds) : null;
            previous = _changed;
            _changed = NewSignal();
        }
        previous.TrySetResult();
    }

    public void ScheduleNext(TimeSpan delay)
    {
        lock (_lock) _nextSpawnAt = _time.GetUtcNow().UtcDateTime + delay;
    }

    public void RecordSpawn()
    {
        lock (_lock)
        {
            _lastSpawnAt = _time.GetUtcNow().UtcDateTime;
            _totalSpawned++;
        }
    }

    private static int Clamp(int seconds) => Math.Clamp(seconds, MinIntervalSeconds, MaxIntervalSeconds);

    private static TaskCompletionSource NewSignal() => new(TaskCreationOptions.RunContinuationsAsynchronously);
}
