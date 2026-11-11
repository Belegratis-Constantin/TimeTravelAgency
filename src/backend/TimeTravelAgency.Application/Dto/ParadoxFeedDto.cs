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
    int? AgentId
);
