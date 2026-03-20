using System;
using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.Cmd;

public class CreateLicensedAgentCmd
{
    [Required, MaxLength(100)]
    public string Firstname { get; set; }
    
    [Required, MaxLength(100)]
    public string Lastname { get; set; }
    
    [Required]
    public DateTime DateOfBirth { get; set; }
    
    [Required]
    public int SpecialisationTime { get; set; }
    
    [Required]
    public int LicenseNumber { get; set; }
    
    [Required]
    public DateTime LicenseExpirationDate { get; set; }
    
    [Required]
    public CreateAddressCmd Address { get; set; }
}