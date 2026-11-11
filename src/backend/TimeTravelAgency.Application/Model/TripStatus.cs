namespace TimeTravelAgency.Application.Model;

/// <summary>
/// Lifecycle of a trip. Scheduled → Active (departed, currently running) → Completed (returned).
/// Cancelled is final and set explicitly. The time-driven transitions are applied by <see cref="Trip.SyncStatus"/>.
/// </summary>
public enum TripStatus
{
    Scheduled = 0,
    Active = 1,
    Completed = 2,
    Cancelled = 3,
}
