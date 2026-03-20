using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.Cmd;

public class CreateManagerCmd
{
    public string Firstname { get; set; } = default!;
    public string Lastname { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!;
    public AddressDto Address { get; set; } = default!;
}