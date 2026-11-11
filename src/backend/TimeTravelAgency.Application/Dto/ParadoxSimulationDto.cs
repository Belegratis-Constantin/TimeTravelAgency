namespace TimeTravelAgency.Application.Dto;

public record ParadoxSimulationDto(
    bool Enabled,
    int IntervalSeconds,
    DateTime? NextSpawnAt,
    DateTime? LastSpawnAt,
    int TotalSpawned
);
