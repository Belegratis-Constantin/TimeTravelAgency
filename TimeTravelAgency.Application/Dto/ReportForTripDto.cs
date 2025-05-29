namespace TimeTravelAgency.Application.Dto;

public record ReportForTripDto
(
    Guid Guid,
    string Header,
    DateTime Date,
    string? Content
);