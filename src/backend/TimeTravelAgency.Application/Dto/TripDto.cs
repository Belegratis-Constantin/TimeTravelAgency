namespace TimeTravelAgency.Application.Dto;

public record TripDto
(
    Guid Guid,
    DateTime DateInRealLife,
    string? TripName,
    string TripType,
    string TripStatus,
    int LicensedAgentId,
    int ManagerId,
    List<ParadoxDto> Paradoxes,
    List<CustomerDto> Customers,
    List<ReportForTripDto> Reports,
    List<ReviewDto> Reviews,
    int? AgentId = null,
    Guid? ManagerGuid = null
);