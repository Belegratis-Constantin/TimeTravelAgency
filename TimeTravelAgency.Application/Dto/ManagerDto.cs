namespace TimeTravelAgency.Application.Dto;

public record ManagerDto
(
    Guid guid,
    string firstname,
    string lastname,
    string email,
    string phoneNumber,
    AddressDto address
);