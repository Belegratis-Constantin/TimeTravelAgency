using System;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Dto;

public record LicensedAgentDto
(
    int id,
    Guid guid,
    string firstname,
    string lastname,
    DateTime dateOfBirth,
    int specialisationTime,
    int licenseNumber,
    DateTime licenseExpirationDate,
    string agentType,
    int? managerId,
    Epoch specialisationEpochId,
    List<TripDto>? trips
);