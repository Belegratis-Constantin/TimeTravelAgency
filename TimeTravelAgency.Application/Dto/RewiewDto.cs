namespace TimeTravelAgency.Application.Dto;

public record ReviewDto
(
    Guid guid,
    int stars,
    string header,
    string? content
);