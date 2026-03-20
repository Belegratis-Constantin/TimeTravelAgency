using System.ComponentModel.DataAnnotations;
using TimeTravelAgency.Application.DataAnnotation;

namespace TimeTravelAgency.Application.Cmd;

public class CreateCustomerCmd
{
    [Required, MaxLength(100)]
    public string Firstname { get; set; }
    [Required, MaxLength(100)]
    public string Lastname { get; set; }
    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; }
    [Required, PhoneNumber]
    public string PhoneNumber { get; set; }
    [Required, MinimumAge(18)]
    public DateTime DateOfBirth { get; set; }
    [Required]
    public AddressDto Address { get; set; }
}