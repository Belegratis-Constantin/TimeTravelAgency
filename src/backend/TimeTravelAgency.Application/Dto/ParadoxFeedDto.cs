namespace TimeTravelAgency.Application.Dto;

/// <summary>
/// A paradox enriched with the trip context the frontend needs to place it
/// (live feed, notifications, per-trip lists) without loading every trip.
/// </summary>
public record ParadoxFeedDto(
    Guid Guid,
    string ParadoxStatus,
    string ParadoxType,
    string Description,
    DateTime CreatedAt,
    Guid TripGuid,
    string? TripName,
    string TripType,
    Guid ManagerGuid,
    int LicensedAgentId,
    int? AgentId,
    string TripStatus = "Active",
    DateTime? ResolvedAt = null,
    int? ResolvedByAgentId = null,
    /// <summary>Escalated once: needs a lock by both the licensed and the support agent.</summary>
    bool DualLockRequired = false,
    bool LicensedLocked = false,
    bool SupportLocked = false,
    /// <summary>Whether the trip has a support agent (required for a dual lock).</summary>
    bool TripHasSupportAgent = false,
    /// <summary>Place in the trip's queue (0 = currently being worked on); null once solved.</summary>
    int? QueuePosition = null
);
