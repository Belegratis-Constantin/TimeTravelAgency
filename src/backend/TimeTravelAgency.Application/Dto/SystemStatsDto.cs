namespace TimeTravelAgency.Application.Dto;

public record SystemStatsDto(
    int TotalTrips,
    int CriticalTripCount,
    int TotalParadoxes,
    int OpenParadoxes,
    int TotalManagers,
    int TotalAgents,
    int TotalCustomers
);
