using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Dto;

public record CriticalTripDto
(
    Guid guid,
    DateTime dateInRealLife,
    string? tripName,
    TripStatus tripStatus,
    int licensedSupportAgentId,
    int licensedAgentId,
    ManagerDto manager
);