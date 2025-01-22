using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.Model;

public record Address
(
    [MaxLength(255)] string Street,
    [MaxLength(255)] int Zip,
    [MaxLength(255)] string City
);