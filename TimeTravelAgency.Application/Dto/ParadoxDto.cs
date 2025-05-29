using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Dto;

public record ParadoxDto
(
    Guid guid,
    ParadoxStatus paradoxStatus,
    ParadoxType paradoxType
);