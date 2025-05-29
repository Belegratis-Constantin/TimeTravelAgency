using System;

namespace TimeTravelAgency.Application.Dto;

public record CustomerDto
(
    Guid guid,
    string firstname,
    string lastname,
    string email,
    string phoneNumber,
    DateTime dateOfBirth,
    AddressDto address,
    List<ReviewDto> reviews
);