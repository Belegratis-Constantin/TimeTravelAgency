using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.Cmd;

public class CreateAddressCmd
{
    [Required, MaxLength(255)]
    public string Street { get; set; }
    
    [Required, MaxLength(50)]
    public string City { get; set; }
    
    [Required, MaxLength(10)]
    public int ZipCode { get; set; }
}