namespace TimeTravelAgency.Application.Dto;

public record ManagerWithIdDto
(
    Guid guid,
    int id,
    string firstname,
    string lastname,
    string email,
    string phoneNumber,
    AddressDto address
);