using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Dto;

public record AgentDto
(
    int id,
    Guid guid,
    string firstname,
    string lastname,
    DateTime dateOfBirth,
    int specialisationTime,
    string agentType,
    int? managerId,
    Epoch specialisationEpochId,
    IEnumerable<TripDto> trips
);