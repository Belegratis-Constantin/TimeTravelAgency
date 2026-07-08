namespace TimeTravelAgency.Application.Dto;

public record ParadoxDto
(
    Guid guid,
    string paradoxStatus,
    string paradoxType
);